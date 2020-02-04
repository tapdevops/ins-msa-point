const mongoose = require( 'mongoose' );
require( 'mongoose-double' )(mongoose);

const PointSchema = mongoose.Schema({
	USER_AUTH_CODE: String,
	LOCATION_CODE: String,
    MONTH: {
		type: Number,
		get: v => Math.floor( v ),
		set: v => Math.floor( v ),
		alias: 'i',
		default: function() {
			return null;
		}
	},
	POINT: Number,
	LAST_INSPECTION_DATE: {
		type: Number,
		get: v => Math.floor( v ),
		set: v => Math.floor( v ),
		alias: 'i',
		default: function() {
			return 0;
		}
	}
});

module.exports = mongoose.model( 'Point', PointSchema, 'TR_POINT_INDEX' );