/*
|--------------------------------------------------------------------------
| Variable
|--------------------------------------------------------------------------
*/
    const kafka = require( 'kafka-node' );
    const dateformat = require('dateformat');
    const moment = require( 'moment-timezone');
    const async = require( 'async');
    

    //Models
    const Models = {
        Point: require( _directory_base + '/app/models/Point.js'),
        KafkaPayload: require( _directory_base + '/app/models/KafkaPayload.js'),
        ViewUserAuth: require( _directory_base + '/app/models/ViewUserAuth.js')
        // const KafkaErrorLog = require( _directory_base + '/app/v1.1/Http/Models/KafkaErrorLogModel.js' );

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
        constructor() { 
            this.result = [];
        }
		async consumer () {
            const kafka = require('kafka-node');
            const Consumer = kafka.Consumer;
            const Offset = kafka.Offset;
            const Client = kafka.KafkaClient;
            const client = new Client({ kafkaHost: config.app.kafka[config.app.env].server_host });
            
            let offsets = await this.getListOffset();
            const topics = [
                { topic: 'INS_MSA_FINDING_TR_FINDING', partition: 0, offset: offsets['INS_MSA_FINDING_TR_FINDING'] },
                { topic: 'INS_MSA_INS_TR_BLOCK_INSPECTION_H', partition: 0, offset: offsets['INS_MSA_INS_TR_BLOCK_INSPECTION_H'] },
                { topic: 'INS_MSA_INS_TR_BLOCK_INSPECTION_D', partition: 0, offset: offsets['INS_MSA_INS_TR_BLOCK_INSPECTION_D'] },
                { topic: 'INS_MSA_INS_TR_INSPECTION_GENBA', partition: 0, offset: offsets['INS_MSA_INS_TR_INSPECTION_GENBA'] },
                { topic: 'INS_MSA_EBCCVAL_TR_EBCC_VALIDATION_H', partition: 0, offset: offsets['INS_MSA_EBCCVAL_TR_EBCC_VALIDATION_H'] }
            ];
            const options = {
                autoCommit: false,
                fetchMaxWaitMs: 1000,
                fetchMaxBytes: 1024 * 1024,
                fromOffset: true,
                requestTimeout: 5000
            };

            const consumer = new Consumer(client, topics, options);
            let offset = new Offset(client);
            consumer.on( 'message', async ( message ) => {
                // console.log(message.offset);
                this.result.push(JSON.parse(message.value));
                if (message) {
                    if (message.topic && message.value) {
                        try {
                            // this.save(message, offset);
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
                let date = new Date();
                var d = new Date(date.getFullYear(), date.getMonth() + 1, 0); //get tanggal terakhir untuk bulan sekarang
                let dateNumber = parseInt(dateformat(d, 'yyyymmdd')); //misalnya 20203101
                let data = JSON.parse(message.value);
                let topic = message.topic;
                let inspectionDate = parseInt(moment( new Date() ).tz( "Asia/Jakarta" ).format( "YYYYMMDDHHmmss" ));
                if (topic === 'INS_MSA_FINDING_TR_FINDING') {

                    //end_time = "" artinya data finding belum diselesaikan
                    if (data.END_TIME != "") {
                        let endTimeNumber = parseInt(data.END_TIME.substring(0, 8));
                        let dueDate = parseInt(data.DUE_DATE.substring(0, 8));
                        
                        //jika finding sudah diselesaikan dan tidak overdue, jika overdue maka user tidak mendapatkan tambahan point
                        if (endTimeNumber <= dueDate) {
                            this.updatePoint(data.UPTUR, 5, dateNumber);
                        }
                        
                        //memberi tambahan point sesuai rating yang diberikan
                        let ratings = [1, 2, 3, 4, 5];
                        for (let i = 0; i < ratings.length; i++) {
                            if (data.RTGVL == ratings[i]) {
                                this.updatePoint(data.UPTUR, ratings[i] - 2, dateNumber);
                                break;
                            }
                        }
                    } else { //jika data finding yang dikirim baru dibuat tambah point satu
                        this.updatePoint(data.INSUR, 1, dateNumber);
                    }
                    this.updateOffset(topic, offsetFetch);
                } else if (topic === 'INS_MSA_INS_TR_BLOCK_INSPECTION_H') {
                    this.updateOffset(topic, offsetFetch);
                    this.updatePoint(data.INSUR, 1, dateNumber);
                } else if (topic === 'INS_MSA_INS_TR_BLOCK_INSPECTION_D') {
                    this.updatePoint(data.INSUR, 1, dateNumber);
                    this.updateOffset(topic, offsetFetch);
                } else if (topic === 'INS_MSA_INS_TR_INSPECTION_GENBA') {
                    this.updatePoint(data.GNBUR, 1, dateNumber);
                    this.updateOffset(topic, offsetFetch);
                } else if (topic === 'INS_MSA_EBCCVAL_TR_EBCC_VALIDATION_H') {
                    this.updatePoint(data.INSUR, 1, dateNumber);
                    this.updateOffset(topic, offsetFetch);
                }
            } catch (err) {
                console.log(err);
            }
        }

        //tambahkan point user
        async updatePoint(userAuthCode, point, dateNumber) {
            let locationCode = await Models.ViewUserAuth.findOne({USER_AUTH_CODE: userAuthCode}).select({LOCATION_CODE: 1});
            if (locationCode){
                let set = new Models.Point({
                    USER_AUTH_CODE: userAuthCode, 
                    LOCATION_CODE: locationCode.LOCATION_CODE,
                    MONTH: dateNumber,
                    POINT: point
                });
                await set.save();
            }
        }
        
        //untuk mendapatkan semua offset dari setiap topic
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
        
        //update offset dari satu topic
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
        printResults() {
            console.log('ihsan');
            console.log(this.result);
        }
    }
    

/*
|--------------------------------------------------------------------------
| Module Exports
|--------------------------------------------------------------------------
*/
	module.exports = new Kafka();