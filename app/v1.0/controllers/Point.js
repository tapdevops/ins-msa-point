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
        ViewUserAuth: require(_directory_base + '/app/models/ViewUserAuth.js')
    }

    //Node_modules
    const dateformat = require('dateformat');
    const axios = require('axios');

    /*
    |--------------------------------------------------------------------------
    | Insert Default Point Per USER_AUTH_CODE dan MONTH
    |--------------------------------------------------------------------------
    |*/

        exports.createOrUpdate = async (req, res) => {
            // let authCode = req.auth.USER_AUTH_CODE;
            // let date = new Date();
            // let d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            // let dateNumber = parseInt(dateformat(d, 'yyyymmdd'));
            // try {
            //     let dataPointCount = await Models.Point.findOne({USER_AUTH_CODE: authCode, MONTH: dateNumber}).countDocuments();

            //     if (dataPointCount == 0) {
            //         let set = new Models.Point({
            //             USER_AUTH_CODE: authCode,
            //             MONTH: dateNumber,
            //             POINT: 0
            //         });
            //         await set.save();
            //     } 
            //     return res.send({
            //         status: true,
            //         message: 'Sukses simpan',
            //         data: []
            //     });
            // } catch (err) {
            //     res.send({
            //         status: false,
            //         message: err.message,
            //         data: []
            //     });
            // }

            /*UNTUK INSERT DATA DUMMY */
            let users = ["0101", "0124", "0126", "0105", "0106", "0107", "0108", "0109", "0110", "0111"];
            let locationCodes = ["4122O,4122P", "5121A", "5121A", "4221D", "4122K", "4122L", "4122M", "4122N", "4122O", "4122P,4122S"];
            let months = [20200131, 20200229, 20200330, 20200131, 20200229, 20200330, 20200131, 20200229, 20200330, 20200131];

            for(let i = 0; i < 10000; i++) {
                let index = Math.floor(Math.random() * 10) + 0;
                let user = "0125";
                let locationCode = "4123X";
                let month = months[index];

                let set = new Models.Point({
                    USER_AUTH_CODE: user,
                    LOCATION_CODE: locationCode,
                    MONTH: month,
                    POINT: 1
                });
                await set.save();
            }
            return res.send({
                status: true
            });
        }


    /*
    |--------------------------------------------------------------------------
    | GET current user point 
    |--------------------------------------------------------------------------
    |*/

        exports.myPoint = async (req, res) => {
            let authCode = req.auth.USER_AUTH_CODE;
            let userPoint = await Models.Point.aggregate([
                {
                    $group: {
                        _id: {
                            USER_AUTH_CODE: "$USER_AUTH_CODE",
                            LOCATION_CODE: "$LOCATION_CODE"
                        },POINT: { $sum: "$POINT" }
                    }
                }, {
                    $match: {
                        "_id.USER_AUTH_CODE": authCode
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
            //dapatkan jumlah point setiap user
            let allUserPoints = await Models.Point.aggregate([
                {
                    $group: {
                        _id: {
                            USER_AUTH_CODE: "$USER_AUTH_CODE",
                            MONTH: "$MONTH",
                            LAST_INSPECTION_DATE: "$LAST_INSPECTION_DATE",
                            LOCATION_CODE: "$LOCATION_CODE"
                        },
                        POINT: { $sum: "$POINT" },
                    }
                }, {
                    $project: {
                        _id: 0,
                        USER_AUTH_CODE: "$_id.USER_AUTH_CODE",
                        LOCATION_CODE: "$_id.LOCATION_CODE",
                        POINT: "$POINT",
                        LAST_INSPECTION_DATE: "$_id.LAST_INSPECTION_DATE"
                    }
                }
            ]);
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
                
                let currentUser = allUserPoints.filter(user => user.USER_AUTH_CODE == authCode);
                
                //dapatkan users BA, dan COMP dengan memfilter allUserPoints menggunakan LOCATION_CODE dari setiap user
                let BAUsers = getBAUsers(allUserPointsBA, currentUser);
                let COMPUsers = getCOMPUsers(allUserPointsCOMP, currentUser);
    
                //get index current user (BA, COMP, National)
                let BAIndex = getIndex(BAUsers, currentUser);
                let COMPIndex = getIndex(COMPUsers, currentUser);
                let nationalIndex = getIndex(allUserPoints, currentUser);
    
                //dapatkan 6 user BA, COMP, dan National
                let sixBAUsers = await getSixUsers(BAUsers, BAIndex, req);
                let sixCOMPUsers = await getSixUsers(COMPUsers, COMPIndex, req);
                let sixNationalUsers = await getSixUsers(allUserPoints, nationalIndex, req);
                
                response.push({
                    BA: sixBAUsers,
                    PT: sixCOMPUsers, 
                    NATIONAL: sixNationalUsers
                });
    
                return res.send({
                    status: true,
                    message: 'success!',
                    data: response
                });
            }
            return res.send({
                status: true,
                message: 'success',
                data: []
            })
        }

        function getBAUsers(allUsers, currentUser) {
            let BARegex = new RegExp(currentUser[0].LOCATION_CODE.substring(0, 4)); //contoh value 4122
            let BAUsers = allUsers.filter(user => {
                return user.LOCATION_CODE.match(BARegex);
            });
            return BAUsers;
        }
       
        function getCOMPUsers(allUsers, currentUser) {
            let COMPRegex = new RegExp(currentUser[0].LOCATION_CODE.substring(0, 2)); //contoh value 41
            let COMPUsers = allUsers.filter(user => {
                return user.LOCATION_CODE.match(COMPRegex);
            });
            return COMPUsers;
        }

        async function getSixUsers(users, index, req) {
            let sixUsers = [];
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
            //jika current user berada di rank 1 - 4, langsung tampilkan users rank 1-6
            if (index < 4) {
                for(let i = 0; i < 6; i++) {
                    if(users[i]) {
                        sixUsers.push(users[i]);
                    } else {
                        sixUsers.push(null);
                    }
                }
            } else if (index > 3 && index < users.length - 1) { //jika current user rank >= 5, maka tampilkan satu user rank atas dan bawahnya
                for(let i = 0; i < 3; i++) {
                    if(users[i]) {
                        sixUsers.push(users[i]);
                    } else {
                        sixUsers.push(null);
                    }
                }
                for(let i = index - 1; i <= index + 1; i++) {
                    if(users[i]) {
                        sixUsers.push(users[i]);
                    } else {
                        sixUsers.push(null);
                    }
                }
            } else if (index === users.length - 1) { //jika current user berada di rank terakhir maka tampilkan 2 user di atasnya  
                for(let i = 0; i < 3; i++) {
                    if(users[i]) {
                        sixUsers.push(users[i]);
                    } else {
                        sixUsers.push(null);
                    }
                }

                for(let i = index - 2; i <= index; i++) {
                    if(users[i]) {
                        sixUsers.push(users[i]);
                    } else {
                        sixUsers.push(null);
                    }
                }
            }
            return sixUsers;
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
                return res.send({
                    status: true
                })
            })
            .catch(err => {
                console.log(err);
            });
        }
       
        


    