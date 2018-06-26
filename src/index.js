'use strict';

const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(null);
AWS.config.update({ region: 'us-east-1' });
const lightsail = new AWS.Lightsail();

const BACKUP_INSTANCES = process.env.BACKUP_INSTANCES.split(',');
let allSnapshots;
let allSnapshotsByInstance = [];

exports.handler = async (event, context, callback) => {
  for (let instance of BACKUP_INSTANCES) {
    let snapshots = await getBackups(instance);
    console.log(snapshots);
  }
};

async function getBackups(instanceName) {
  if (!allSnapshots) {
    allSnapshots = (await lightsail.getInstanceSnapshots().promise()).instanceSnapshots;
    for (let snapshot of allSnapshots) {
      let instance = snapshot.fromInstanceName;
      if (!allSnapshotsByInstance[instance]) {
        allSnapshotsByInstance[instance] = [];
      }

      allSnapshotsByInstance[instance].push(snapshot);
    }
  }

  return allSnapshotsByInstance[instanceName];
}