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
        Point: require(_directory_base + '/app/models/Point.js')
    }

    //Node_modules
    const dateformat = require('dateformat');

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
            let users = ["0101", "0124", "0126", "0105", "0106", "0107", "0108", "0109", "0110", "0111"];
            let locationCodes = ["4122O,4122P", "5121A", "5121A", "4221D", "4122K", "4122L", "4122M", "4122N", "4122O", "4122P,4122S"];
            let months = [20200131, 20200229, 20200330, 20200131, 20200229, 20200330, 20200131, 20200229, 20200330, 20200131];

            for(let i = 0; i < 100000; i++) {
                let index = Math.floor(Math.random() * 10) + 0;
                let user = users[index];
                let locationCode = locationCodes[index];
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
    | GET 6 user point per BA, PT, National
    |--------------------------------------------------------------------------
    |*/
    
        exports.getPoints = async (req, res) => {
            let authCode = req.auth.USER_AUTH_CODE;
            let response = [];
            let allUserPoints = await Models.Point.aggregate([
                {
                    $group: {
                        _id: {
                            USER_AUTH_CODE: "$USER_AUTH_CODE",
                            LOCATION_CODE: "$LOCATION_CODE"
                        },POINT: { $sum: "$POINT" }
                    }
                }, {
                    $project: {
                        _id: 0,
                        USER_AUTH_CODE: "$_id.USER_AUTH_CODE",
                        LOCATION_CODE: "$_id.LOCATION_CODE",
                        POINT: "$POINT"
                    }
                }
            ]);
            
            allUserPoints.sort((a,b) => (b.POINT > a.POINT) ? 1 : ((a.POINT > b.POINT) ? -1 : 0));
            let allUserPointsBA = allUserPoints.map(object => ({ ...object }));
            let allUserPointsCOMP = allUserPoints.map(object => ({ ...object}));
            
            let currentUser = allUserPoints.filter(user => user.USER_AUTH_CODE == authCode);
            
            let COMPUsers = getCOMPUsers(allUserPointsCOMP, currentUser);
            let nationalUsers = getNationalUser(allUserPoints, currentUser);
            let BAUsers = getBAUsers(allUserPointsBA, currentUser);

            response.push({
                BA: BAUsers,
                PT: COMPUsers, 
                NATIONAL: nationalUsers
            });

            return res.send({
                status: true,
                message: 'success!',
                data: response
            });
        }

        function getBAUsers(allUsers, currentUser) {
            let BARegex = new RegExp(currentUser[0].LOCATION_CODE.substring(0, 4));
            let BAUsers = allUsers.filter(user => {
                return user.LOCATION_CODE.match(BARegex);
            });
            let index = BAUsers.findIndex(user => {
                return user.USER_AUTH_CODE === currentUser[0].USER_AUTH_CODE
            });
           
            let sixBAUsers = getSixUsers(BAUsers, index);
            return sixBAUsers;
        }

        function getCOMPUsers(allUsers, currentUser) {
            let COMPRegex = new RegExp(currentUser[0].LOCATION_CODE.substring(0, 2));
            let COMPUsers = allUsers.filter(user => {
                return user.LOCATION_CODE.match(COMPRegex);
            });
            let index = COMPUsers.findIndex(user => {
                return user.USER_AUTH_CODE === currentUser[0].USER_AUTH_CODE
            });
            
            let sixCOMPUsers = getSixUsers(COMPUsers, index);
            return sixCOMPUsers;
        }

        function getNationalUser(allUsers, currentUser) {
            let index = allUsers.findIndex(user => {
                return user.USER_AUTH_CODE === currentUser[0].USER_AUTH_CODE
            });
            
            let sixNationalUsers = getSixUsers(allUsers, index);
            return sixNationalUsers;
        }

        function getSixUsers(users, index) {
            let sixUsers = [];
            let rank = 0;
            users.map(function (user) {
                user.RANK = ++rank;
            });
            if (index < 4) {
                for(let i = 0; i < 6; i++) {
                    if(users[i]) {
                        sixUsers.push(users[i]);
                    } else {
                        sixUsers.push(null);
                    }
                }
            } else if (index > 3 && index < users.length - 1) {
                for(let i = 0; i < 3; i++) {
                    if(users[i]) {
                        sixUsers.push(users[i]);
                    } else {
                        sixUsers.push(null);
                    }
                }
                for(let i = index; i < index + 1; i++) {
                    if(users[--i]) {
                        sixUsers.push(users[--i]);
                    } else {
                        sixUsers.push(null);
                    }
                    if(users[++i]) {
                        sixUsers.push(users[++i]);
                    } else {
                        sixUsers.push(null);
                    }
                }
            } else if (index === users.length - 1) {
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


    