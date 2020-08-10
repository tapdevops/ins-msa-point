/*
 |--------------------------------------------------------------------------
 | Variable
 |--------------------------------------------------------------------------
 */
const mongoose = require('mongoose');
const db = require(_directory_base + '/config/database.js');
const connectHS = mongoose.createConnection(db.hectareStatement[config.app.env].url, {useNewUrlParser: true, useUnifiedTopology: true});
/*
 |--------------------------------------------------------------------------
 | Schema
 |--------------------------------------------------------------------------
 */
const CompSchema = mongoose.Schema({
	NATIONAL: String,
	REGION_CODE: String,
	COMP_CODE: String,
	COMP_NAME: String,
	ADDRESS: String,
	INSERT_TIME: {
		type: Number,
		get: v => Math.floor(v),
		set: v => Math.floor(v),
		alias: 'i',
		default: function () {
			return null;
		}
	},
	UPDATE_TIME: {
		type: Number,
		get: v => Math.floor(v),
		set: v => Math.floor(v),
		alias: 'i',
		default: function () {
			return null;
		}
	},
	DELETE_TIME: {
		type: Number,
		get: v => Math.floor(v),
		set: v => Math.floor(v),
		alias: 'i',
		default: function () {
			return null;
		}
	}
});

/*
|--------------------------------------------------------------------------
| Module Exports
|--------------------------------------------------------------------------
*/
module.exports = connectHS.model('Comp', CompSchema, 'TM_COMP');