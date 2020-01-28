const mongoose = require( 'mongoose' );
require( 'mongoose-double' )(mongoose);

const KafkaSchema = mongoose.Schema({
    TOPIC: String,
    OFFSET: Number
});

module.exports = mongoose.model( 'KafkaPayload', KafkaSchema, 'T_KAFKA_PAYLOAD' );