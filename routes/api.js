/*
 |--------------------------------------------------------------------------
 | Setup
 |--------------------------------------------------------------------------
 */

    //Controllers
    const Controllers = {
        v_1_1: {
            Point: require( _directory_base + '/app/v1.1/controllers/Point.js' ),
        },
        v_1_0: {
            Point: require( _directory_base + '/app/v1.0/controllers/Point.js' ),
        }
    }
    const VerifyToken =  require(_directory_base + '/app/utils/VerifyToken.js')
    module.exports = ( app ) => {

        /*
        |--------------------------------------------------------------------------
        | Welcome Message
        |--------------------------------------------------------------------------
        */
            app.get( '/', ( req, res ) => {
                return res.json( { 
                    application: {
                        name : 'Microservice Point',
                        env : config.app.env,
                        port : config.app.port[config.app.env]
                    } 
                } )
            } );
            
        /*
        |--------------------------------------------------------------------------
        | Versi 1.1
        |--------------------------------------------------------------------------
        */
       //tambahan rank point user untuk Kabun dan EM 
        app.get('/api/v1.1/point/users', VerifyToken,  Controllers.v_1_1.Point.userPoints);
        app.get('/api/v1.1/point/report/:month', VerifyToken,  Controllers.v_1_1.Point.report);
            
        /*
        |--------------------------------------------------------------------------
        | Versi 1.0
        |--------------------------------------------------------------------------
        */
        
        app.get('/api/v1.0/point/me', VerifyToken,  Controllers.v_1_0.Point.myPoint);
        app.get('/api/v1.0/point/users', VerifyToken,  Controllers.v_1_0.Point.userPoints);
        // app.post('/api/v1.0/point/user', Controllers.v_1_0.Point.updatePoint);
    }
