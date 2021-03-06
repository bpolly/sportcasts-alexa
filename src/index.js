'use strict';
var Alexa = require('alexa-sdk');
var config = require('./config.js')
var SERVER_URL = config.SERVER_URL;
var SKILL_NAME = 'Sports Broadcasts';
var moment = require('moment-timezone');
var request = require('request');
var dateFormat = require('dateformat');
var startTime = Date.now();
var req = require('req-fast');

exports.handler = function(event, context, callback) {
  console.log("exports.handler called");
  var alexa = Alexa.handler(event, context);
  alexa.appId = config.APP_ID;
  alexa.registerHandlers(handlers);
  alexa.execute();
  console.log("exports.handler call finished");

};

var handlers = {
    'LaunchRequest': function () {
        var speechOutput = "What team or game would you like to know about?";
        var reprompt = speechOutput;
        this.emit(':ask', speechOutput, reprompt);
    },
    'SessionEndedRequest': function () {
      this.emit(':tell', 'Goodbye!');
    },
    'GetGameInfoIntent': function () {
        this.emit('GetGameInfo');
    },
    'GetGameInfo': function () {
        console.log("getGameInfo called: " + (Date.now()-startTime));
        startTime = Date.now();
        var slots = this.event.request.intent.slots;

        var data = {};
        console.log(slots);
        slots.TeamOne.value ? data["team1"] = slots.TeamOne.value : undefined;
        slots.TeamTwo.value ? data["team2"] = slots.TeamTwo.value : undefined;
        slots.League.value ? data["league"] = slots.League.value : undefined;
        slots.Sport.value ? data["sport"] = slots.Sport.value : undefined;
        slots.Date.value ? data["date"] = slots.Date.value : undefined;
        data["amz_id"] = this.event.session.user.userId;

        console.log(data);
        requestGameInfo(data, this.emit);
    },
    'SetZipCodeIntent': function () {
      var data = {};
      var slots = this.event.request.intent.slots;
      var inputtedZip = slots.ZipCode.value;
      if(inputtedZip){
        data["amz_id"] = this.event.session.user.userId;
        data["zip_code"] = inputtedZip.toString();;
        setZipCode(data, this.emit);
      }
      else {
        this.emit('AMAZON.HelpIntent');
      }
    },
    'GetZipCodeIntent': function () {
      var data = {};
      data["amz_id"] = this.event.session.user.userId;
      getZipCode(data, this.emit);
    },
    'AMAZON.HelpIntent': function () {
        var speechOutput = "You can say ask me about a team, or a specific game or TV network, or, you can say exit... What can I help you with?";
        var reprompt = "What team or game would you like to know about?";
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Goodbye!');
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', 'Goodbye!');
    },
    'Unhandled': function () {
      var speechOutput = "Sorry, I did not get that. Trying asking about a specific team";
      this.emit(':ask', speechOutput, speechOutput);
    },
};

function requestGameInfo(data, emitFunc) {
  console.log("requestGameInfo called: " + (Date.now()-startTime));
  startTime = Date.now();

  var options = {
    url: SERVER_URL + "games",
    method: "POST",
    dataType: "form",
    data: data
  };

  req(options, function(err, resp){
    if (err) {
      return console.error('upload failed:', err);
    }
    console.log("Req-fast server responded: " + (Date.now()-startTime));
    startTime = Date.now();
    console.log('Upload successful!  Server responded with:', resp);
    buildOutput(JSON.parse(JSON.stringify(resp.body)), emitFunc);
  });

}

function setZipCode(data, emitFunc){
  var options = {
    url: SERVER_URL + "zip_codes",
    method: "POST",
    dataType: "form",
    data: data
  };

  req(options, function(err, resp){
    if (err) {
      emitFunc(':tell', "Zip code failed to save");
      return console.error('upload failed:', err);
    }
    console.log("Req-fast server responded: " + (Date.now()-startTime));
    console.log('Upload successful!  Server responded with:', resp);
    var zip_speakable = data["zip_code"].toString().split('').join(' ').replace(/0/g, "oh")
    emitFunc(':tell', "Zip code set to " + zip_speakable);
  });
}

function getZipCode(data, emitFunc){
  var options = {
    url: SERVER_URL + "retrieve_zip",
    method: "POST",
    dataType: "form",
    data: data
  };

  req(options, function(err, resp){
    if (err) {
      emitFunc(':tell', "Failed to retrieve zip code information");
      return console.error('upload failed:', err);
    }
    console.log('Upload successful!  Server responded with:', resp);
    if(resp.body["zip_code"].length == 0){
      emitFunc(':tell', "No saved zip code");
    }
    else {
      var zip_speakable = resp.body["zip_code"].toString().split('').join(' ').replace(/0/g, "oh")
      emitFunc(':tell', "Your zip code is " + zip_speakable);
    }
  });
}

function buildOutput(games, emitFunc) {
  console.log("buildOutput called: " + (Date.now()-startTime));
  startTime = Date.now();

  console.log("GAMES: " + games);

  // the cavs play the knicks on tnt
  var outputString = "";
  if(games.length == 0){
    var tvNetworks = "Sorry, I could not find any matching games.";
    outputString = tvNetworks;
    console.log("---- sup 1 ------")
  }
  else {
    console.log("---- sup 21 ------");
    var game = games[0];
    var tvNetworks = game.tv_networks;
    var game_date = new Date(game.date);
    var original_game_date = new Date(game.date);
    var date = "";
    var game_date_est = new Date(game_date.setMinutes(game_date.getMinutes() - 240));
    var date_now = new Date();
    var date_now_est = new Date(date_now.setMinutes(date_now.getMinutes() - 240));
    var game_time_formatted = calculateTime(original_game_date);
    if (game_date_est.getDate() - date_now_est.getDate() == 0){
      date = "today at " + game_time_formatted;
    }
    else if (game_date_est.getDate() - date_now_est.getDate() == 1){

      date = "tomorrow at " + game_time_formatted;
    }
    else {
      date = "on " + dateFormat(game_date_est, "dddd mmmm dS") + " at " + game_time_formatted;
    }

    outputString = "The " + game.home_team + " play the " + game.away_team + " " + date + " on " + tvNetworks;
    console.log("---- sup 22 ------");

  }

  console.log("buildOutput finished: " + (Date.now()-startTime));
  startTime = Date.now();

  emitFunc(':tell', outputString);
}

function calculateTime(date){
  // use MomentJS to format the time
  console.log("Original date: " + date);
  console.log("Formatted date: " + moment(date).tz("UTC").format("h:mm a"));
  return moment(date).tz("UTC").format("h:mm a");
}
