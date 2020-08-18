/*
 |--------------------------------------------------------------------------
 | Variable
 |--------------------------------------------------------------------------
 */
const mongoose = require('mongoose');
const SchemaTypes = mongoose.Schema.Types;
const db = require(_directory_base + '/config/database.js');
const connectInspection = mongoose.createConnection(db.inspection[config.app.env].url, {useNewUrlParser: true, useUnifiedTopology: true});
require('mongoose-double')(mongoose);

/*
 |--------------------------------------------------------------------------
 | Schema
 |--------------------------------------------------------------------------
 */
const InspectionHSchema = mongoose.Schema({
	BLOCK_INSPECTION_CODE: String,
	WERKS: String,
	AFD_CODE: String,
	BLOCK_CODE: String,
	AREAL: String,
	INSPECTION_TYPE: String,
	INSPECTION_DATE: {
		type: Number,
		get: v => Math.floor(v),
		set: v => Math.floor(v),
		alias: 'i',
		default: function () {
			return 0;
		}
	},
	INSPECTION_SCORE: SchemaTypes.Double,
	INSPECTION_RESULT: String,
	STATUS_SYNC: String,
	SYNC_TIME: {
		type: Number,
		get: v => Math.floor(v),
		set: v => Math.floor(v),
		alias: 'i',
		default: function () {
			return 0;
		}
	},
	START_INSPECTION: {
		type: Number,
		get: v => Math.floor(v),
		set: v => Math.floor(v),
		alias: 'i',
		default: function () {
			return 0;
		}
	},
	END_INSPECTION: {
		type: Number,
		get: v => Math.floor(v),
		set: v => Math.floor(v),
		alias: 'i',
		default: function () {
			return 0;
		}
	},
	LAT_START_INSPECTION: String,
	LONG_START_INSPECTION: String,
	LAT_END_INSPECTION: String,
	LONG_END_INSPECTION: String,
	INSERT_USER: String,
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
| Module Exports
|--------------------------------------------------------------------------
*/
module.exports = connectInspection.model('Inspection H', InspectionHSchema, 'TR_BLOCK_INSPECTION_H');