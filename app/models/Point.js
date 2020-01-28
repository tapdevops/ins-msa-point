const mongoose = require( 'mongoose' );
require( 'mongoose-double' )(mongoose);

const PointSchema = mongoose.Schema({
    USER_AUTH_CODE: String,
    MONTH: {
		type: Number,
		get: v => Math.floor( v ),
		set: v => Math.floor( v ),
		alias: 'i',
		default: function() {
			return null;
		}
	},
    POINT: Number
});

module.exports = mongoose.model( 'Point', PointSchema, 'TR_POINT' );