/*
|--------------------------------------------------------------------------
| Variable
|--------------------------------------------------------------------------
*/
    const kafka = require( 'kafka-node' );
    const dateformat = require('dateformat');

//Models
// const KafkaErrorLog = require( _directory_base + '/app/v1.1/Http/Models/KafkaErrorLogModel.js' );
    const Models = {
        Point: require( _directory_base + '/app/models/Point.js'),
        KafkaPayload: require( _directory_base + '/app/models/KafkaPayload.js')
    }
/*
|--------------------------------------------------------------------------
| Kafka Server Library
|--------------------------------------------------------------------------
|
| Apache Kafka is an open-source stream-processing software platform 
| developed by LinkedIn and donated to the Apache Software Foundation, 
| written in Scala and Java. The project aims to provide a unified, 
| high-throughput, low-latency platform for handling real-time data feeds.
|
*/
	class Kafka {
		async consumer () {
            const kafka = require('kafka-node');
            const Consumer = kafka.Consumer;
            const Offset = kafka.Offset;
            const Client = kafka.KafkaClient;
            const client = new Client({ kafkaHost: config.app.kafka[config.app.env].server_host });
            
            let offsets = await this.getListOffset();
            const topics = [
                { topic: 'INS_MSA_FINDING_TR_FINDING', partition: 0, offset: offsets['INS_MSA_FINDING_TR_FINDING'] },
                { topic: 'INS_MSA_INS_TR_BLOCK_INSPECTION_H', partition: 0, offset: offsets['INS_MSA_INS_TR_BLOCK_INSPECTION_H'] }
            ];
            const options = {
                autoCommit: false,
                fetchMaxWaitMs: 1000,
                fetchMaxBytes: 1024 * 1024,
                fromOffset: true
            };

            const consumer = new Consumer(client, topics, options);
            let offset = new Offset(client);
            consumer.on( 'message', async ( message ) => {
                if (message) {
                    if (message.topic && message.value) {
                        try {
                            this.save(message, offset);
                        } catch (err) {
                            console.log(err);
                        }
                    }
                }
			})
			consumer.on( 'error', function( err ) {
				console.log( 'error', err );
            });
            consumer.on('offsetOutOfRange', function (topic) {
                topic.maxNum = 2;
                offset.fetch([topic], function (err, offsets) {
                    if (err) {
                        return console.error(err);
                    }
                    var min = Math.min.apply(null, offsets[topic.topic][topic.partition]);
                    consumer.setOffset(topic.topic, topic.partition, min);
                });
            });
            
        }
        async save(message, offsetFetch) {
            try {
                let data = JSON.parse(message.value);
                console.log(data.INSUR);
                let topic = message.topic;
                if (topic === 'INS_MSA_FINDING_TR_FINDING') {
                    this.updateOffset(topic, offsetFetch);
                    this.updatePoint(data.INSUR, 1);
                } else if (topic === 'INS_MSA_INS_TR_BLOCK_INSPECTION_H') {
                    this.updateOffset(topic, offsetFetch);
                    this.updatePoint(data.INSUR, 1);
                }
            } catch (err) {
                console.log(err);
            }
        }
        async updatePoint(authCode, point) {
            let date = new Date();
            var d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            let dateNumber = parseInt(dateformat(d, 'yyyymmdd'));
           
            await Models.Point.updateOne(
                { USER_AUTH_CODE: authCode, MONTH: dateNumber},
                { $inc: { POINT: point } }
            );
            
        }
        async getListOffset() {
            try {
                let data = await Models.KafkaPayload.find({});
                let mapped = data.map(item => ({ [item.TOPIC]: item.OFFSET }) );
                let dataObject = Object.assign({}, ...mapped );
                 
                return dataObject;
            } catch (err) {
                console.log(err);
                return null;
            }
        }
        updateOffset(topic, offsetFetch) {
            try {
                offsetFetch.fetch([
                    { topic: topic, partition: 0, time: Date.now(), maxNum: 1 }
                ], function (err, data) {
                    let lastOffsetNumber = data[topic]['0'][0];
                    Models.KafkaPayload.findOneAndUpdate({
                        TOPIC: topic
                    }, {
                        OFFSET: lastOffsetNumber 
                    }, {
                        new: true
                    }).then(() => {
                        console.log('sukses update offset');
                    }).catch(err => {
                        console.log(err);
                    });
                });
            } catch (err) {
                 console.log(err);
            }
        }
	}

/*
|--------------------------------------------------------------------------
| Module Exports
|--------------------------------------------------------------------------
*/
	module.exports = new Kafka();