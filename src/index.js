'use strict';
var Alexa = require('alexa-sdk');
var config = require('./config.js')
var SERVER_URL = config.SERVER_URL;
var SKILL_NAME = 'Sports Broadcasts';
var request = require('request');
var dateFormat = require('dateformat');

exports.handler = function(event, context, callback) {
  var alexa = Alexa.handler(event, context);
  alexa.appId = config.APP_ID;
  alexa.registerHandlers(handlers);
  alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        this.emit('GetFact');
    },
    'GetGameInfoIntent': function () {
        this.emit('GetGameInfo');
    },
    'GetGameInfo': function () {
        var slots = this.event.request.intent.slots;

        var data = {};
        console.log(slots);
        slots.TeamOne.value ? data["team1"] = slots.TeamOne.value : undefined;
        slots.TeamTwo.value ? data["team2"] = slots.TeamTwo.value : undefined;
        slots.League.value ? data["league"] = slots.League.value : undefined;
        slots.Sport.value ? data["sport"] = slots.Sport.value : undefined;
        slots.Date.value ? data["date"] = slots.Date.value : undefined;

        console.log(data);
        requestGameInfo(data, this.emit);
    },
    'handleServerResponse': function (data) {

      this.emit(':tellWithCard', outputString, SKILL_NAME, randomFact)
    },
    'AMAZON.HelpIntent': function () {
        var speechOutput = "You can say tell me a space fact, or, you can say exit... What can I help you with?";
        var reprompt = "What can I help you with?";
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Goodbye!');
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', 'Goodbye!');
    }
};

function requestGameInfo(data, emitFunc) {
  request.post({url:SERVER_URL, formData: data}, function optionalCallback(err, httpResponse, body) {
    if (err) {
      return console.error('upload failed:', err);
    }
    console.log('Upload successful!  Server responded with:', body);
    buildOutput(JSON.parse(body), emitFunc);
  });

}


function buildOutput(games, emitFunc) {
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
    if (game_date_est.getDate() - date_now_est.getDate() == 0){
      date = "today at " + dateFormat(game_date_est, "shortTime");
    }
    else if (game_date_est.getDate() - date_now_est.getDate() == 1){

      date = "tomorrow at " + dateFormat(game_date_est, "shortTime");
    }
    else {
      date = "on " + dateFormat(game_date_est, "dddd mmmm dS") + " at " + dateFormat(game_date_est, "shortTime");
    }

    var home_team = game.home_team.split(" ").slice(-1)[0]
    var away_team = game.away_team.split(" ").slice(-1)[0]

    outputString = "The " + home_team + " play the " + away_team + " " + date + " on " + tvNetworks;
    console.log("---- sup 22 ------");

  }
  // else {
  //   var i = 0;
  //   var tvNetworks = "";
  //   for(i = 0; i < games.length; i++){
  //     tvNetworks = tvNetworks + ", " + games[i].tv_networks;
  //     //tvNetworks = arr.slice(0, arr.length - 1).join(', ') + ", and " + arr.slice(-1);
  //   }
  //   outputString = tvNetworks;
  //   console.log("---- sup 3 ------")
  //
  // }


  emitFunc(':tell', outputString);
}
