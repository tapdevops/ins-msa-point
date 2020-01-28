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
        let authCode = req.auth.USER_AUTH_CODE;
        let date = new Date();
        let d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        let dateNumber = parseInt(dateformat(d, 'yyyymmdd'));
        try {
            let dataPointCount = await Models.Point.findOne({USER_AUTH_CODE: authCode, MONTH: dateNumber}).countDocuments();

            if (dataPointCount == 0) {
                let set = new Models.Point({
                    USER_AUTH_CODE: authCode,
                    MONTH: dateNumber,
                    POINT: 0
                });
                await set.save();
            } 
            return res.send({
                status: true,
                message: 'Sukses simpan',
                data: []
            });
        } catch (err) {
            res.send({
                status: false,
                message: err.message,
                data: []
            });
        }
    }


    