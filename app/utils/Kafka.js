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
			// const kafka = require('kafka-node');
            // const Consumer = kafka.Consumer;
            // const Offset = kafka.Offset;
            // const Client = kafka.KafkaClient;
            // const client = new Client({ kafkaHost: config.app.kafka[config.app.env].server_host });
            // const offset = new kafka.Offset(client);
            // let latestOffsetFinding = 0;
            // let latestOffsetInspection = 0;
            // offset.fetch([
            //     { topic: 'INS_MSA_FINDING_TR_FINDING', partition: 0 },
            //     { topic: 'INS_MSA_INS_TR_BLOCK_INSPECTION_H', partition: 0 }
            // ], async (err, data) => {
            //     latestOffsetFinding = data['INS_MSA_FINDING_TR_FINDING']['0'][0];
            //     latestOffsetInspection = data['INS_MSA_INS_TR_BLOCK_INSPECTION_H']['0'][0];
            //     latestOffsetFinding--;
            //     latestOffsetInspection--;
            //     // let offsets = await this.getListOffset();
            //     const topics = [
            //         { topic: 'INS_MSA_FINDING_TR_FINDING', partition: 0, offset: 0},
            //         { topic: 'INS_MSA_INS_TR_BLOCK_INSPECTION_H', partition: 0, offset: latestOffsetInspection}
            //     ];
                
            //     const options = {
            //         autoCommit: false,
            //         fetchMaxWaitMs: 1000,
            //         fetchMaxBytes: 1024 * 1024,
            //         fromOffset: true
            //     };
            //     const consumer = new Consumer(client, topics, options);
    
            //     this.consumerListen(consumer);
            // });

            const kafka = require('kafka-node');
            const Consumer = kafka.Consumer;
            const Offset = kafka.Offset;
            const Client = kafka.KafkaClient;
            const client = new Client({ kafkaHost: config.app.kafka[config.app.env].server_host });
            
            let offsets = await this.getListOffset();
            const topics = [
                { topic: 'INS_MSA_FINDING_TR_FINDING', partition: 0, offset: offsets['INS_MSA_FINDING_TR_FINDING'] + 1 },
                { topic: 'INS_MSA_INS_TR_BLOCK_INSPECTION_H', partition: 0, offset: offsets['INS_MSA_INS_TR_BLOCK_INSPECTION_H'] + 1 }
            ];
            const options = {
                autoCommit: false,
                fetchMaxWaitMs: 1000,
                fetchMaxBytes: 1024 * 1024,
                fromOffset: true
            };

            const consumer = new Consumer(client, topics, options);
            const offset = new Offset(client);
            consumer.on( 'message', async ( message ) => {
                let i = 0;
                if (message) {
                    if (message.topic && message.value) {
                        // await this.save(message);
                        try {
                            let data = JSON.parse(message.value);
                            let topic = message.topic;
                            let offset = message.offset;
                            if (topic === 'INS_MSA_FINDING_TR_FINDING') {
                                let date = new Date();
                                var d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                                let dateNumber = parseInt(dateformat(d, 'yyyymmdd'));
                                let i = 0;
                                let dataPointCount = await Models.Point.find({
                                    USER_AUTH_CODE: data.INSUR, MONTH: dateNumber
                                }).count();
                                console.log(dataPointCount);
                                if (dataPointCount == 0) {
                                    var set = new Models.Point({
                                        USER_AUTH_CODE: data.INSUR, 
                                        MONTH: dateNumber,
                                        POINT: 1
                                    });
                                    await set.save();
                                }
                                Models.Point.findOneAndUpdate({
                                    USER_AUTH_CODE: data.INSUR, MONTH: dateNumber
                                },{ 
                                    $inc: { POINT: 1 } 
                                },{ new: true })
                                .then( user => {
                                    // console.log('sukses update');
                                })
                                .catch(err => {
                                    console.log(err);
                                })
                                    
                                
                                // await this.updatePoint(data.INSUR, 1);
                                // await this.updateOffset(topic, offset);
                            } else if (topic === 'INS_MSA_INS_TR_BLOCK_INSPECTION_H') {
                                // await this.updatePoint(data.INSUR, 1);
                                // await this.updateOffset(data.INSUR, offset);
                            }
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
        async save(message) {
            try {
                let data = JSON.parse(message.value);
                let topic = message.topic;
                let offset = message.offset;
                if (topic === 'INS_MSA_FINDING_TR_FINDING') {
                    await this.updatePoint(data.INSUR, 1);
                    // await this.updateOffset(topic, offset);
                } else if (topic === 'INS_MSA_INS_TR_BLOCK_INSPECTION_H') {
                    // await this.updatePoint(data.INSUR, 1);
                    // await this.updateOffset(data.INSUR, offset);
                }
            } catch (err) {
                console.log(err);
            }
        }
        async updatePoint(authCode, point) {
            let date = new Date();
            var d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            let dateNumber = parseInt(dateformat(d, 'yyyymmdd'));
            Models.Point.find({USER_AUTH_CODE: authCode, MONTH: dateNumber})
            .then(async (data) => {
                if (data.length == 0) {
                    let set = new Models.Point({
                        USER_AUTH_CODE: authCode,
                        MONTH: dateNumber,
                        POINT: point
                    });
                    await set.save();
                } else {
                    await Models.Point.updateOne(
                        { USER_AUTH_CODE: authCode, MONTH: dateNumber},
                        { $inc: { POINT: point } }
                    )
                }
            })
            .catch(err => {
                console.log(err);
            })
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
        async updateOffset(topic, offset) {
            console.log(offset);
            try {
                await Models.KafkaPayload.updateOne(
                    {TOPIC: topic },
                    {OFFSET: offset}
                );
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