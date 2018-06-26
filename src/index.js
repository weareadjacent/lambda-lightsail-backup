'use strict';

const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(null);
AWS.config.update({region: 'us-east-1'});

const lightsail = new AWS.Lightsail();

const BACKUP_INSTANCES = process.env.BACKUP_INSTANCES.split(',');

let allSnapshots;
let backupsByInstance = {};

exports.handler = async (event, context, callback) => {
  for (let instance of BACKUP_INSTANCES) {
    let latest = await getLatestBackup(instance);

    if (latest.createdAt.toDateString() !== (new Date()).toDateString()) {
      createBackup(instance);
    }
  }
};

async function getBackups(instance) {
  if (!allSnapshots) {
    allSnapshots = (await lightsail.getInstanceSnapshots().promise()).instanceSnapshots;

    for (let snapshot of allSnapshots) {
      let instance = snapshot.fromInstanceName;
      if (!backupsByInstance[instance]) {
        backupsByInstance[instance] = [];
      }

      backupsByInstance[instance].push(snapshot);
    }

    // Sort by date
    for (let [instance, backups] of Object.entries(backupsByInstance)) {
      backups.sort(dateSort);
    }
  }

  return backupsByInstance[instance];
}

async function getLatestBackup(instance) {
  let backups = await getBackups(instance);
  return backups[backups.length - 1];
}

function dateSort(a, b){
  return a.createdAt - b.createdAt;
}

function createBackup(instance) {
  let date = new Date();
  let name = `${instance}-${date.getTime()}-autosnap`;

  return lightsail.createInstanceSnapshot({
    instanceName: instance,
    instanceSnapshotName: name
  }).promise();
}