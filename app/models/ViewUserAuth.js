/*
 |--------------------------------------------------------------------------
 | Models - View User Auth
 |--------------------------------------------------------------------------
 */
const Mongoose = require('mongoose');
const ViewUserAuthSchema = Mongoose.Schema({
	USER_AUTH_CODE: String,
	EMPLOYEE_NIK: String,
	USER_ROLE: String,
	REF_ROLE: String,
	LOCATION_CODE: String,
	INSERT_USER: String,
	HRIS_JOB: String,
	HRIS_FULLNAME: String,
	PJS_JOB: String,
	PJS_FULLNAME: String,
	LOCATION_CODE_NATIONAL: String,
	LOCATION_CODE_REGION: String,
	LOCATION_CODE_COMP: String,
	LOCATION_CODE_BA: String,
	LOCATION_CODE_AFD: String,
	INSERT_TIME: {
		type: Number,
		get: v => Math.floor(v),
		set: v => Math.floor(v),
		alias: 'i',
		default: function () {
			return 0;
		}
	},
	UPDATE_USER: String,
	UPDATE_TIME: {
		type: Number,
		get: v => Math.floor(v),
		set: v => Math.floor(v),
		alias: 'i',
		default: function () {
			return 0;
		}
	},
	DELETE_USER: String,
	DELETE_TIME: {
		type: Number,
		get: v => Math.floor(v),
		set: v => Math.floor(v),
		alias: 'i',
		default: function () {
			return 0;
		}
	}
});

/*
 |--------------------------------------------------------------------------
 | Exports
 |--------------------------------------------------------------------------
 */
module.exports = Mongoose.model('ViewUserAuth_v_2_0', ViewUserAuthSchema, 'VIEW_USER_AUTH');