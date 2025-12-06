async function checkAlarms(db, stationId, temperatureAir, humidityAir, pressureAir, sunlight, humiditySoil) {
    const triggeredAlarms = [];

    const values = {
        temperatureAir,
        humidityAir,
        pressureAir,
        sunlight,
        humiditySoil
    };

    try {
        const alarmSnapshot = await db
            .collection("alarms")
            .where("stations", "array-contains", stationId)
            .get();

        for (const alarmDoc of alarmSnapshot.docs) {
            const alarmId = alarmDoc.id;

            const conditionsSnapshot = await db
                .collection("alarms")
                .doc(alarmId)
                .collection("conditions")
                .get();

            let triggeredConditions = [];

            conditionsSnapshot.forEach((condDoc) => {
                const cond = condDoc.data();

                const param = cond.parameter;
                const triggerLevel = cond.trigger_level;
                const triggerOnHigher = cond.trigger_on_higher;

                if (!(param in values)) return;

                const currentValue = values[param];

                if (triggerOnHigher && currentValue > triggerLevel) {
                    triggeredConditions.push(condDoc.id);
                } else if (!triggerOnHigher && currentValue < triggerLevel) {
                    triggeredConditions.push(condDoc.id);
                }
            });

            if (triggeredConditions.length > 0) {
                triggeredAlarms.push({
                    alarmId: alarmId,
                    conditionId: triggeredConditions[0]
                });
            }
        }

        return triggeredAlarms;

    } catch (err) {
        console.error("Error checking alarms:", err);
        return [];
    }
}

async function createAlarmOccurrences(db, admin, triggeredAlarms, measurementId, stationId) {
    try {
        const stationDoc = await db.collection("stations").doc(stationId).get();
        if (!stationDoc.exists) {
            console.error("Station not found:", stationId);
            return;
        }

        const userId = stationDoc.data().owner_id;
        const batch = db.batch();

        triggeredAlarms.forEach(({ alarmId, conditionId }) => {
            const docRef = db.collection("alarm_occurrences").doc();
            batch.set(docRef, {
                alarm_id: alarmId,
                condition_id: conditionId,
                measurement_id: measurementId,
                station_id: stationId,
                user_id: userId,
                date: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        console.log("Alarm occurrences created successfully. (" + triggeredAlarms.length + ")");

    } catch (err) {
        console.error("Error creating alarm occurrences:", err);
    }
}

async function sendTriggeredAlarmNotifications(db, messaging, triggeredAlarms, measurementId, stationId) {
    const parameterUnits = {
        temperatureAir: "℃",
        humidityAir: "%",
        pressureAir: "hPa",
        sunlight: "lx",
        humiditySoil: "%"
    };

    try {
        const stationDoc = await db.collection("stations").doc(stationId).get();
        if (!stationDoc.exists) {
            console.error("Station not found:", stationId);
            return;
        }
        const userId = stationDoc.data().owner_id;

        const tokenDoc = await db.collection("fcmTokens").doc(userId).get();
        if (!tokenDoc.exists) {
            console.error("FCM token not found for user:", userId);
            return;
        }
        const token = tokenDoc.data().token;

        for (const { alarmId, conditionId } of triggeredAlarms) {
            const alarmDoc = await db.collection("alarms").doc(alarmId).get();
            if (!alarmDoc.exists) continue;

            const alarmName = alarmDoc.data().name;

            const conditionDoc = await db
                .collection("alarms")
                .doc(alarmId)
                .collection("conditions")
                .doc(conditionId)
                .get();

            if (!conditionDoc.exists) continue;

            const cond = conditionDoc.data();
            const { parameter, trigger_level, trigger_on_higher } = cond;

            const unit = parameterUnits[parameter] || "";
            const formattedLevel = Number(trigger_level).toFixed(2);

            const capitalized =
                parameter.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());

            const body = trigger_on_higher
                ? `${capitalized} exceeded ${formattedLevel}${unit}`
                : `${capitalized} dropped below ${formattedLevel}${unit}`;

            const title = `Alarm Triggered: ${alarmName}`;

            await messaging.send({
                token,
                notification: { title, body },
                data: {
                    alarmId,
                    conditionId,
                    measurementId,
                    stationId
                },
                android: {
                    notification: { channel_id: "alarms" }
                }
            });
        }

        console.log("All triggered alarm notifications sent.");

    } catch (err) {
        console.error("Error sending triggered alarm notifications:", err);
    }
}

async function handleMeasurement(db, messaging, admin, measurementId, stationId, reading) {
    const alarms = await checkAlarms(
        db,
        stationId,
        reading.temperatureAir,
        reading.humidityAir,
        reading.pressureAir,
        reading.sunlight,
        reading.humiditySoil
    );

    console.log("Triggered alarms:", alarms);

    await createAlarmOccurrences(db, admin, alarms, measurementId, stationId);
    await sendTriggeredAlarmNotifications(db, messaging, alarms, measurementId, stationId);
}

module.exports = { handleMeasurement };
