/*
 |--------------------------------------------------------------------------
 | Setup
 |--------------------------------------------------------------------------
 */
    //Controllers
    const Controllers = {
        v_1_0: {
            
        }
    }
    const Middleware = {
        v_1_0: {
            VerifyToken: require(_directory_base + '/app/v1.0/Http/Middleware/VerifyToken.js')
        }
    }
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
        | Versi 1.0
        |--------------------------------------------------------------------------
        */
      
    }
