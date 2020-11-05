/*
|--------------------------------------------------------------------------
| Variable
|--------------------------------------------------------------------------
*/
    const kafka = require( 'kafka-node' );
    const dateformat = require('dateformat');
    const moment = require( 'moment-timezone');

    //Models
    const Models = {
        Point: require( _directory_base + '/app/models/Point.js'),
        KafkaPayload: require( _directory_base + '/app/models/KafkaPayload.js'),
        ViewUserAuth: require( _directory_base + '/app/models/ViewUserAuth.js'),
        InspectionH: require( _directory_base + '/app/models/InspectionH.js'),
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
            const ConsumerGroup = kafka.ConsumerGroup;
			var options = {
				// connect directly to kafka broker (instantiates a KafkaClient)
				kafkaHost: config.app.kafka[config.app.env].server_host,
				groupId: "INS_MSA_POINT_GROUP",
				autoCommit: true,
				autoCommitIntervalMs: 5000,
				sessionTimeout: 15000,
				fetchMaxBytes: 10 * 1024 * 1024, // 10 MB
				// An array of partition assignment protocols ordered by preference. 'roundrobin' or 'range' string for
				// built ins (see below to pass in custom assignment protocol)
				protocol: ['roundrobin'],
				// Offsets to use for new groups other options could be 'earliest' or 'none'
				// (none will emit an error if no offsets were saved) equivalent to Java client's auto.offset.reset
				fromOffset: 'latest',
				// how to recover from OutOfRangeOffset error (where save offset is past server retention)
				// accepts same value as fromOffset
				outOfRangeOffset: 'earliest'
			};
			let consumerGroup = new ConsumerGroup(options, ['INS_MSA_FINDING_TR_FINDING', 'INS_MSA_INS_TR_BLOCK_INSPECTION_H', 'INS_MSA_INS_TR_INSPECTION_GENBA', 'INS_MSA_EBCCVAL_TR_EBCC_VALIDATION_H']);
			console.log(config.app.kafka[config.app.env])
			consumerGroup.on('message', async (message) => {
				try {
					if (message) {
                        if (message.topic && message.value) {
                            try {
                                this.save(message);
                            } catch (err) {
                                console.log(err);
                            }
                        }
                    }
				} catch(err) {
					console.log(err)
				}
			});
		
			consumerGroup.on('error', function onError(error) {
				console.error(error);
			});
        }
        async save(message) {
            try {
                let now = moment(new Date()).tz('Asia/Jakarta')
                let endOfMonth = new Date(now.year(), now.month() + 1, 0);
                let dateNumber = parseInt(dateformat(endOfMonth, 'yyyymmdd')); //misalnya 20203101
                let data = JSON.parse(message.value);
                let topic = message.topic;
                let inspectionDate = parseInt(moment( new Date() ).tz( "Asia/Jakarta" ).format( "YYYYMMDDHHmmss" ));
                let werks = data.WERKS;
                
                if (topic === 'INS_MSA_FINDING_TR_FINDING') {

                    //jika finding sudah selesai, maka lakukan perhitungan point
                    if (data.END_TIME != "" && data.RTGVL == 0) {
                        let endTimeNumber = parseInt(data.END_TIME.substring(0, 8));
                        let dueDate = parseInt(data.DUE_DATE.substring(0, 8));
                        //jika finding sudah diselesaikan dan tidak overdue dapat 5 point ,
                        // jika overdue maka user yang menyelasaikan finding tidak mendapatkan tambahan point
                        if (endTimeNumber <= dueDate) {
                            this.updatePoint(data.UPTUR, 5, dateNumber, null, werks);
                        }
                        
                        //update point user yang membuat finding
                        this.updatePoint(data.INSUR, 2, dateNumber, null, werks);
                        //memberi tambahan point sesuai rating yang diberikan
                        
                    } else if (data.END_TIME != "" && data.RTGVL != 0) {
                        let ratings = [1, 2, 3, 4];
                        for (let i = 0; i < ratings.length; i++) {
                            if (data.RTGVL == ratings[i]) {
                                this.updatePoint(data.UPTUR, ratings[i] - 2, dateNumber, null, werks);
                                break;
                            }
                        }
                    } 
                } else if (topic === 'INS_MSA_INS_TR_BLOCK_INSPECTION_H') {
                    this.updatePoint(data.INSUR, 1, dateNumber, inspectionDate, werks);
                } else if (topic === 'INS_MSA_INS_TR_INSPECTION_GENBA') {
                    let inspection = await Models.InspectionH.findOne({BLOCK_INSPECTION_CODE: data.BINCH}).select({_id: 0, WERKS: 1});
                    let werksGenba = inspection.WERKS;
                    this.updatePoint(data.GNBUR, 1, dateNumber, inspectionDate, werksGenba);
                } else if (topic === 'INS_MSA_EBCCVAL_TR_EBCC_VALIDATION_H') {
                    this.updatePoint(data.INSUR, 1, dateNumber, inspectionDate, werks);
                }
            } catch (err) {
                console.log(err);
            }
        }

        //tambahkan point user
        async updatePoint(userAuthCode, point, dateNumber, inspectionDate = 0, werks) {
            console.log(werks);
            let set = new Models.Point({
                USER_AUTH_CODE: userAuthCode, 
                LOCATION_CODE: werks,
                MONTH: dateNumber,
                POINT: point,
                LAST_INSPECTION_DATE: inspectionDate
            });
            // console.log(set);
            await set.save()
            .then(data => {
                console.log('berhasil save');
            })
            .catch(err => {
                if (inspectionDate != 0) {
                    Models.Point.updateOne({
                        USER_AUTH_CODE: userAuthCode,
                        LOCATION_CODE: werks,
                        MONTH: dateNumber,
                    }, {
                        LAST_INSPECTION_DATE: inspectionDate,
                        $inc: {
                            POINT: point
                        }
                    })
                    .then( () => {
                        console.log("sukses update", userAuthCode)
                    })
                    .catch(err => {
                        console.log(err);
                    });
                } else {
                    Models.Point.updateOne({
                        USER_AUTH_CODE: userAuthCode,
                        MONTH: dateNumber,
                        LOCATION_CODE: werks,
                    }, {
                        $inc: {
                            POINT: point
                        }
                    })  
                    .then( (data) => {
                        console.log("sukses update", userAuthCode)
                    })
                    .catch(err => {
                        console.log(err);
                    });
                }
            });
        }
    }
    

/*
|--------------------------------------------------------------------------
| Module Exports
|--------------------------------------------------------------------------
*/
	module.exports = new Kafka();