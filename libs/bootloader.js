var Q = require('q');
var fs = require('fs');
var crypto = require('crypto');
var SparkApi = require(
  '../node_modules/spark-cli/lib/ApiClient'
);


exports.generateCode = function(opts){
  var deferred = Q.defer();

  fs.readFile('./duino/template.ino', 'utf8', function(err, data){
    var fileContents = replaceKeysWithProperties(opts, data);
    var currentDate = new Date().valueOf().toString();
    var fileName = crypto.createHash('sha1')
      .update(currentDate + opts.coreId)
      .digest('hex') + '.ino';
    var filePath = './duino/generated/' + fileName;

    fs.writeFile(
      filePath, fileContents, 'utf8',
      function(error, data){
        deferred.resolve(filePath);
      }
    );
  });

  return deferred.promise;
};


exports.flash = function(opts){
  var deferred = Q.defer();

  var client = new SparkApi(
    'https://api.spark.io',
    process.env.SPARK_ACCESS_TOKEN
  );

  client.flashCore(opts.coreId, {file : opts.filePath}).then(function(){
    console.log('\nBootloaded New Code:', opts.filePath);
    deferred.resolve();
  });

  return deferred.promise;
};


var replaceKeysWithProperties = function(opts, blob){
  var digitalOutputs = [];
  var digitalInputs = [];
  var digitalInputRefs = [];
  var digitalInputStates = [];
  var analogOutputs = [];
  var analogInputs = [];
  var analogInputRefs = [];
  var analogInputStates = [];
  var servoDefinitions = '';
  var servoAttachments = '';
  var servoChecks = '';
  var servos = [];

  for(var key in opts.pins){
    if(opts.pins[key] == 'output' && key.indexOf('D') != -1)
      digitalOutputs.push(key);
    else if(opts.pins[key] == 'input' && key.indexOf('D') != -1)
      digitalInputs.push(key);
    else if(opts.pins[key] == 'output' && key.indexOf('A') != -1)
      analogOutputs.push(key);
    else if(opts.pins[key] == 'input' && key.indexOf('A') != -1)
      analogInputs.push(key);
    else if(opts.pins[key] == 'servo'){
      servos.push(key);
    }
  }

  digitalInputs.forEach(function(input){
    digitalInputRefs.push(input.replace('D', ''));
    digitalInputStates.push(0);
  });

  analogInputs.forEach(function(input){
    analogInputStates.push(0);
    analogInputRefs.push(input.replace('A', ''));
  });

  servos.forEach(function(servo){
    servoDefinitions += 'Servo servo_' + servo + '; \n';
    servoAttachments += 'servo_' + servo + '.attach(' + servo + '); \n';
    servoChecks += "if(command.charAt(1) == '" + servo.replace('A', '') + "'){ servo_" + servo + ".write(pinVal); }"
  });

  blob = blob.replace('¡¡servoDefintions¡¡', servoDefinitions);
  blob = blob.replace('¡¡servoAttachments¡¡', servoAttachments);
  blob = blob.replace('¡¡servoChecks¡¡', servoChecks);

  blob = blob.replace('¡¡digitalInputs¡¡',
    '{' + digitalInputs.join(',') + '}'
  );

  blob = blob.replace('¡¡digitalOutputs¡¡',
    '{' + digitalOutputs.join(',') + '}'
  );

  blob = blob.replace('¡¡analogInputs¡¡',
    '{' + analogInputs.join(',') + '}'
  );

  blob = blob.replace('¡¡analogOutputs¡¡',
    '{' + analogOutputs.join(',') + '}'
  );

  blob = blob.replace('¡¡analogInputStates¡¡',
    '{' + analogInputStates.join(',') + '}'
  );
  blob = blob.replace('¡¡digitalInputStates¡¡',
    '{' + digitalInputStates.join(',') + '}'
  );

  if(analogInputRefs.length){
    blob = blob.replace('¡¡analogInputRefs¡¡',
      '{\'' + analogInputRefs.join('\',\'') + '\'}'
    );
  } else
    blob = blob.replace('¡¡analogInputRefs¡¡', '{}');

  if(digitalInputRefs.length){
    blob = blob.replace('¡¡digitalInputRefs¡¡',
      '{\'' + digitalInputRefs.join('\',\'') + '\'}'
    );
  } else
    blob = blob.replace('¡¡digitalInputRefs¡¡', '{}');

  blob = blob.replace('¡¡analogThreshold¡¡',
     opts.analogThreshold
  );

  return blob;
};
