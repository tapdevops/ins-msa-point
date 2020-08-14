/*
 |--------------------------------------------------------------------------
 | App Setup
 |--------------------------------------------------------------------------
 |
 | Untuk menghandle models, libraries, helper, node modules, dan lain-lain
 |
 */
    //Models
    const Models = {
        Point: require(_directory_base + '/app/models/Point.js'),
        ViewUserAuth: require(_directory_base + '/app/models/ViewUserAuth.js'),
        Comp: require(_directory_base + '/app/models/Comp.js'),
    }

    //Node_modules
    const dateformat = require('dateformat');
    const axios = require('axios');
    const async = require('async');

    /*
    |--------------------------------------------------------------------------
    | GET current user point 
    |--------------------------------------------------------------------------
    |*/

        exports.myPoint = async (req, res) => {
            let authCode = req.auth.USER_AUTH_CODE;
            let date = new Date();
            var d = new Date(date.getFullYear(), date.getMonth() + 1, 0); //get tanggal terakhir untuk bulan sekarang
            let dateNumber = parseInt(dateformat(d, 'yyyymmdd')); //misalnya 20203101
            let userPoint = await Models.Point.aggregate([
                {
                    $match: {
                        "USER_AUTH_CODE": authCode,
                        MONTH: dateNumber
                    }
                }
            ]);
            if (userPoint.length > 0) {
                return res.send({
                    status: true,
                    message: 'success!',
                    data: {
                        POINT: userPoint[0].POINT
                    }
                });
            }
            return res.send({
                status: true,
                message: 'success!',
                data: {
                    POINT: 0
                }
            });
        }

    /*
    |--------------------------------------------------------------------------
    | GET 6 user point per BA, PT, National
    |--------------------------------------------------------------------------
    |*/
    
        exports.userPoints = async (req, res) => {
            let authCode = req.auth.USER_AUTH_CODE;
            let response = [];
            let locationCode = await Models.ViewUserAuth.findOne({USER_AUTH_CODE: authCode}).select({LOCATION_CODE: 1});
            let date = new Date();
            var d = new Date(date.getFullYear(), date.getMonth() + 1, 0); //get tanggal terakhir untuk bulan sekarang
            let dateNumber = parseInt(dateformat(d, 'yyyymmdd')); //misalnya 20203101
            
            //Periksa current user di TR_POINT, jika tidak ada 
            //insert data current user dengan POINT 0
            Models.Point.findOneAndUpdate(
                { 
                    USER_AUTH_CODE: authCode,
                    MONTH: dateNumber,
                },
                {
                  $setOnInsert: { 
                      USER_AUTH_CODE: authCode,
                      MONTH: dateNumber,
                      LOCATION_CODE: locationCode.LOCATION_CODE,
                      POINT: 0, 
                      LAST_INSPECTION_DATE: 0
                   },
                },
                {
                  returnOriginal: false,
                  upsert: true,
                }
            ).then(async () => {
                //dapatkan jumlah point setiap user
                
                let allUserPoints = await Models.Point.aggregate([
                    {
                        $group: {
                            _id: {
                                USER_AUTH_CODE: "$USER_AUTH_CODE",
                                MONTH: "$MONTH"
                            },
                            POINT: { $sum: "$POINT" }, 
                            LAST_INSPECTION_DATE: { $max: "$LAST_INSPECTION_DATE" } 
                        }
                    }, {
                        //join ke table view user auth untuk mendapatkan user_role
                        $lookup: {
                            from: "VIEW_USER_AUTH",
                            localField: "_id.USER_AUTH_CODE",
                            foreignField: "USER_AUTH_CODE",
                            as: "viewUserAuth"
                        }
                    }, 
                    {
                        $unwind: "$viewUserAuth"
                    }, 
                    {
                        $project: {
                            _id: 0,
                            USER_AUTH_CODE: "$_id.USER_AUTH_CODE",
                            MONTH: "$_id.MONTH",
                            LOCATION_CODE: "$viewUserAuth.LOCATION_CODE",
                            POINT: "$POINT",
                            LAST_INSPECTION_DATE: "$LAST_INSPECTION_DATE",
                            USER_ROLE: "$viewUserAuth.USER_ROLE"
                        }
                    },
                    { 
                        $match: {
                            MONTH: dateNumber
                        }
                    }
                ])
                let currentUser = allUserPoints.filter(user => user.USER_AUTH_CODE == authCode);
                allUserPoints = allUserPoints.filter(user => user.USER_ROLE == 'ASISTEN_LAPANGAN');
                if (allUserPoints.length > 0) {
                    allUserPoints.sort((a,b) => {
                        
                        //jika point user sama, bandingkan LAST_INSPECTION_DATE nya
                        if (a.POINT == b.POINT) {
                            return (b.LAST_INSPECTION_DATE > a.LAST_INSPECTION_DATE) ? 1 : ((a.LAST_INSPECTION_DATE > b.LAST_INSPECTION_DATE) ? -1 : 0);    
                        } else {
                            return (b.POINT > a.POINT) ? 1 : ((a.POINT > b.POINT) ? -1 : 0);
                        }
                    } );

                    //copy value dari allUserPoints ke 2 variabel lain agar tidak 
                    // conflict ketika function getBAUsers dan getCOMPUsers dipanggil
                    let allUserPointsBA = allUserPoints.map(object => ({ ...object }));
                    let allUserPointsCOMP = allUserPoints.map(object => ({ ...object}));
                    
                    //dapatkan users BA, dan COMP dengan memfilter allUserPoints menggunakan LOCATION_CODE dari setiap user
                    let BAUsers = getBAUsers(allUserPointsBA, currentUser, req.auth.USER_ROLE);
                    let COMPUsers = getCOMPUsers(allUserPointsCOMP, currentUser, req.auth.USER_ROLE);
                    //get index current user (BA, COMP, National)
                    //jika user_role bukan asisten_lapangan indexUser = 0
                    let BAIndex = req.auth.USER_ROLE != 'ASISTEN_LAPANGAN' ? 0 : getIndex(BAUsers, currentUser);
                    let COMPIndex = req.auth.USER_ROLE != 'ASISTEN_LAPANGAN' ? 0 : getIndex(COMPUsers, currentUser);
                    let nationalIndex = req.auth.USER_ROLE != 'ASISTEN_LAPANGAN' ? 0 : getIndex(allUserPoints, currentUser);
                    
                    /*jika role user asisten lapangan dapatkan 6 user BA, COMP, dan National
                     * jika role user bukan asisten lapangan maka tampilkan
                     * semua rank point BA, top 10 COMPANY, dan top 10 NATIONAL
                    */
                    let baUsers = await getUsers(BAUsers, BAIndex, req, 'BA');
                    let compUsers = await getUsers(COMPUsers, COMPIndex, req, 'COMPANY');
                    let nationalUsers = await getUsers(allUserPoints, nationalIndex, req, 'NATIONAL');
                    
                    response.push({
                        BA: baUsers,
                        PT: compUsers, 
                        NATIONAL: nationalUsers
                    });
        
                    return res.send({
                        status: true,
                        message: 'success!',
                        data: response
                    });
                } else {
                    return res.send({
                        status: true,
                        message: 'success',
                        data: []
                    });
                }
            })
            .catch(err => {
                console.log(err)
                return res.send({
                    status: false,
                    message: err.message,
                    data: []
                });
            });
        }

        function getBAUsers(allUsers, currentUser, userRole) {
            if (userRole == 'ASISTEN_LAPANGAN') {
                let BARegex = new RegExp(currentUser[0].LOCATION_CODE.substring(0, 4)); //contoh value 4122
                let BAUsers = allUsers.filter(user => {
                    return user.LOCATION_CODE.match(BARegex);
                });
                return BAUsers;
            } else if(userRole == 'KEPALA_KEBUN') {
                let BAUsers = allUsers.filter(user => {
                    /*
                    * SPLIT location code kepala kebun misalny 4122V,4123X,4122R
                    * Menjadi array[4122V,4123X,4122R]    
                    */
                    let locationCodes = currentUser[0].LOCATION_CODE.split(',');
                    let userLocationCode = user.LOCATION_CODE.substring(0, 4); //hilangkan afd_code misalnya 4122R => 4122
                    for(let i = 0; i < locationCodes.length; i++) {
                        let ba = locationCodes[i].substring(0, 4); //contoh value 4122
                        if (userLocationCode == ba) {
                            return true;
                        }
                    }
                });
                return BAUsers;
            } else if(userRole == 'EM') {
                let BAUsers = allUsers.filter(user => {
                    /*
                    * SPLIT location code kepala kebun misalny 4122V,4123X,4122R
                    * Menjadi array[4122V,4123X,4122R]    
                    */
                    let locationCodes = currentUser[0].LOCATION_CODE.split(',');
                    for(let i = 0; i < locationCodes.length; i++) {

                        //jika location code dari EM lebih dari 2 digit maka substring sampai index 4 misalny 4122R => 4122
                        //jika location code dari EM hanya 2 digit langsung assign ke variable ba
                        let ba = locationCodes[i].length > 2 ? locationCodes[i].substring(0, 4) : locationCodes[i]; 
                        
                        //jika location code dari EM lebih dari 2 digit maka substring setiap location code user sampai index 4 misalny 4122R => 4122
                        //jika location code dari EM hanya 2 digit maka substring setiap location code user sampai index 2 misalny 4122R => 41
                        let userLocationCode = locationCodes[i].length > 2 ? user.LOCATION_CODE.substring(0, 4) : user.LOCATION_CODE.substring(0, 2);
                        if (userLocationCode == ba) {
                            return true;
                        }
                    }
                });
                return BAUsers;
            }
        }
       
        function getCOMPUsers(allUsers, currentUser, userRole) {
            if (userRole == 'ASISTEN_LAPANGAN') {
                let currentUserLocationCode = currentUser[0].LOCATION_CODE.substring(0, 2); //contoh value 41
                let COMPUsers = allUsers.filter(user => {
                    let splittedLocationCode = user.LOCATION_CODE.split(',')
                    // filterCOMPUser(splittedLocationCode, currentUserLocationCode)
                    for(let i = 0; i < splittedLocationCode.length; i++) {
                        let compCode = splittedLocationCode[i].substring(0, 2)
                        if (compCode == currentUserLocationCode) {
                            return true
                        }
                    }
                });
                return COMPUsers;
            } else if(userRole == 'KEPALA_KEBUN') {
                let COMPUsers = allUsers.filter(user => {
                    /*
                    * SPLIT location code kepala kebun misalny 4122V,4123X,4122R
                    * Menjadi array[4122V,4123X,4122R] karena kepala kebun memiliki banyak location code    
                    */
                    let locationCodes = currentUser[0].LOCATION_CODE.split(','); 
                    for(let i = 0; i < locationCodes.length; i++) {
                        //ambil 2 digit pertama untuk di compare di level company contoh value 41
                        let currentUserLocationCode = locationCodes[i].substring(0, 2); 
                        // semua location code user di split misalnya [4122,4123]
                        let splittedLocationCode = user.LOCATION_CODE.split(',')

                        // filterCOMPUser(splittedLocationCode, currentUserLocationCode)
                        for(let i = 0; i < splittedLocationCode.length; i++) {
                            //ambil 2 digit pertama untuk di compare di level company
                            let compCode = splittedLocationCode[i].substring(0, 2); 
                            //misalnya 41 dan 41 maka return true
                            if (compCode == currentUserLocationCode) { 
                                return true
                            }
                        }
                    }
                });
                return COMPUsers;
            } else if(userRole == 'EM') {
                let COMPUsers = allUsers.filter(user => {
                    /*
                    * SPLIT location code kepala kebun misalny 4122V,4123X,4122R
                    * Menjadi array[4122V,4123X,4122R]    
                    */
                    let locationCodes = currentUser[0].LOCATION_CODE.split(',');
                    for(let i = 0; i < locationCodes.length; i++) {

                        //substring setiap location code EM sampai index 2, misalny 4122R => 41
                        let ba = locationCodes[i].substring(0, 2);
                        
                        //substring setiap location code user sampai index 2, misalny 4122R => 41
                        let userLocationCode = user.LOCATION_CODE.substring(0, 2);
                        
                        if (userLocationCode == ba) {
                            return true;
                        }
                    }
                });
                return COMPUsers;
            }
        }

        async function getUsers(users, index, req, level) {
            let usersToReturn = [];
            let rank = 0;
            await Promise.all(users.map(async function (user) {
                user.RANK = ++rank;
                let viewUser = await Models.ViewUserAuth.findOne({
                            USER_AUTH_CODE: user.USER_AUTH_CODE
                        })
                        .select({
                            EMPLOYEE_NIK: 1,
                            USER_ROLE: 1,
                            LOCATION_CODE: 1,
                            REF_ROLE: 1,
                            HRIS_JOB: 1,
                            PJS_JOB: 1,
                            HRIS_FULLNAME: 1,
                            PJS_FULLNAME: 1
                        });
                if (viewUser) {
                    let fullname = viewUser.HRIS_FULLNAME? viewUser.HRIS_FULLNAME: viewUser.PJS_FULLNAME
                    if (fullname) {
                        fullname = fullname.split(' ');
                        if (fullname[1]) {
                            if (fullname[0].length <= 2) {
                                fullname = fullname[0].substr(0, 1) + '.' + " " + fullname[1];
                            } else {
                                fullname = fullname[0] + " " + fullname[1].substr(0, 1) + '.';
                            }
                        } else {
                            fullname = fullname[0];
                        }
                    }
                    user.FULLNAME =  fullname;
                    user.EMPLOYEE_NIK = viewUser.EMPLOYEE_NIK;
                    user.USER_ROLE = viewUser.USER_ROLE;
                    user.REF_ROLE = viewUser.REF_ROLE;
                    user.JOB = viewUser.HRIS_JOB ? viewUser.HRIS_JOB : viewUser.PJS_JOB;
                }

                let userAuthCode = 'default';
                try{
                    //get url dari image profile setiap user
                    let imageProfileURL = config.app.url[config.app.env].microservice_images + "/api/v2.0/foto-profile";
                    axios.defaults.headers.common['Authorization'] = req.headers.authorization;
                    if (user.USER_AUTH_CODE) { 
                        userAuthCode = user.USER_AUTH_CODE;
                    }
                    let result = await axios.post(imageProfileURL, {USER_AUTH_CODE: userAuthCode});
                    if (result.data.data.URL) {
                        user.IMAGE_URL = result.data.data.URL
                    } else {
                        user.IMAGE_URL = null;//config.app.url[config.app.env].microservice_images + '/files/images-profile/default.png';
                    }
                } catch (err) {
                    console.log(err);
                }
            }));
            if (req.auth.USER_ROLE == 'ASISTEN_LAPANGAN') { //jika user role asisten lapangan
                //jika current user berada di rank 1 - 4 atau jika jumlah user < 7, maka langsung tampilkan users rank 1-6
                if (index < 4 || users.length < 7) {
                    for(let i = 0; i < 6; i++) {
                        if(users[i]) {
                            usersToReturn.push(users[i]);
                        } else {
                            usersToReturn.push(null);
                        }
                    }
                } else if (index > 3 && index < users.length - 1) { //jika current user rank > 4, maka tampilkan satu user rank atas dan bawahnya
                    for(let i = 0; i < 3; i++) {
                        if(users[i]) {
                            usersToReturn.push(users[i]);
                        } else {
                            usersToReturn.push(null);
                        }
                    }
                    for(let i = index - 1; i <= index + 1; i++) {
                        if(users[i]) {
                            usersToReturn.push(users[i]);
                        } else {
                            usersToReturn.push(null);
                        }
                    }
                } else if (index === users.length - 1) { //jika current user berada di rank terakhir maka tampilkan 2 user di atasnya  
                    for(let i = 0; i < 3; i++) {
                        if(users[i]) {
                            usersToReturn.push(users[i]);
                        } else {
                            usersToReturn.push(null);
                        }
                    }
                    for(let i = index - 2; i <= index; i++) { 
                        if(users[i]) {
                            usersToReturn.push(users[i]);
                        } else {
                            usersToReturn.push(null);
                        }
                    }
                }
                return usersToReturn;
            } else {
                // let splittedLocationCode = locationCode.split(',');
                // for(let i = 0; i < splittedLocationCode.length; i++) {
                    
                // }
                if (level == 'BA') {
                    for(let i = index; i < users.length; i++) {
                        if(users[i]) {
                            usersToReturn.push(users[i]);
                        } else {
                            usersToReturn.push(null);
                        }
                    }
                } else {
                    for(let i = index; i < 10; i++) {
                        if(users[i]) {
                            usersToReturn.push(users[i]);
                        } else {
                            usersToReturn.push(null);
                        }
                    }
                }
                return usersToReturn; 
            }
        }

        function getIndex(users, currentUser) {
            let index = users.findIndex(user => {
                return user.USER_AUTH_CODE === currentUser[0].USER_AUTH_CODE
            });
            return index;
        }

        exports.updatePoint = async (req, res) => {
            Models.Point.updateOne({
                USER_AUTH_CODE: req.body.USER_AUTH_CODE,
                MONTH: 20200229,
            }, {
                LAST_INSPECTION_DATE: 20200211235959,
                $inc: {
                    POINT: parseInt(req.body.POINT)
                }
            })
            .then( () => {
                console.log('USER_AUTH_CODE: ', req.body.USER_AUTH_CODE);
                console.log('update point berhasil: ', parseInt(req.body.POINT));
                var os = require('os');
                var ifaces = os.userInfo([{
                    options: 'utf-8'
                }]);

                console.log(ifaces)
                return res.send({
                    status: true
                })
            })
            .catch(err => {
                console.log(err);
            });
        }

        exports.report = (req, res) => {
            if(!req.params.month) {
                return res.send({
                    status: false, 
                    message: 'Month not found!',
                    data: []
                });
            }
            let month = parseInt(req.params.month);
            
            async.auto({
                getAllPoints: function(callback) {
                    Models.Point.aggregate([
                        {
                            $lookup: {
                                from: "VIEW_USER_AUTH",
                                foreignField: "USER_AUTH_CODE",
                                localField: "USER_AUTH_CODE",
                                as: "viewUser"
                            }
                        },{
                        $unwind: "$viewUser" 
                        },{
                            $project: {
                                _id: 0,
                                FULLNAME: {$ifNull: ["$viewUser.HRIS_FULLNAME", "$viewUser.PJS_FULLNAME"]},
                                NIK: "$viewUser.EMPLOYEE_NIK",
                                USER_AUTH_CODE: 1,
                                LOCATION_CODE: "$viewUser.LOCATION_CODE",
                                POINT: 1,
                                MONTH: 1,
                                JOB: {$ifNull: ["$viewUser.HRIS_JOB", "$viewUser.PJS_JOB"]}
                            }
                        },{
                            $match: {
                                MONTH: month,
                                JOB: 'ASISTEN LAPANGAN'
                            }
                        }, {
                            $sort: {
                                POINT: -1
                            }
                        }
                    ])
                    .then(data => {
                        callback(null, data);
                    })
                    .catch(err => { 
                        console.log(err);
                        callback(err)
                    })
                },
                mappingPeriode: ['getAllPoints', function(results, callback) {
                    let points = results.getAllPoints;
                    points.map(async (point) => {
                        let lastDateOfMonth = point.MONTH.toString();
                        let year = lastDateOfMonth.substring(0, 4);
                        let month = lastDateOfMonth.substring(5, 6);
                        let periode = new Date(`${month}/01/${year}`);
                        periode = dateformat(periode, 'mm/dd/yyyy');
                        point.MONTH = undefined;
                        point.PERIODE = periode;
                        
                    });
                    callback(null, points)
                }],
                getCompName: ['mappingPeriode', function(results, callback) {
                    let points = results.mappingPeriode;
                    async.each(points, function(point, callbackEach) {
                        let compCode = point.LOCATION_CODE.substring(0, 2);
                        Models.Comp.findOne({COMP_CODE: compCode}).select({_id: 0, COMP_NAME: 1})
                        .then( data => {
                            point.BUSINESS_AREA = data.COMP_NAME;
                            callbackEach();
                        })
                        .catch(err => {
                            console.log(err);
                            callbackEach(err, null);
                        });
                    }, function(err) {
                        if (err) {
                            callback(err, null);
                            return;
                        } else {
                            callback(null, points);
                        }
                    })     
                }]
            }, function(err, results) {
                if(err) {
                    return res.send({
                        status: false,
                        message: 'Internal Server error',
                        data: []
                    })
                }
                res.send({
                    status: true,
                    message: 'Success',
                    data: results.getCompName
                });
            });
        }
       
        


    