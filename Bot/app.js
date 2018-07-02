/*-----------------------------------------------------------------------------
A simple Language Understanding (LUIS) bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
// APPINSIGHT: Add underscore for flattening to name/value pairs
var _ = require("underscore");

// APPINSIGHT: Add NPM package applicaitoninsights
let appInsights = require("applicationinsights");

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
// This default message handler is invoked if the user's utterance doesn't
// match any intents handled by other dialogs.
var bot = new builder.UniversalBot(connector, function (session, args) {
    session.send('I didn\'t understand that!');
});

bot.set('storage', tableStorage);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);

// APPINSIGHT: Set up ApplicationInsights with Web App Bot settings "BotDevAppInsightsKey"
appInsights.setup(process.env.BotDevAppInsightsKey)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true,true)
    .setUseDiskRetryCaching(true)
    .start();

// APPINSIGHT: Get client 
let appInsightsClient = appInsights.defaultClient;

// APPINSIGHT: Log LUIS results to Application Insights
// APPINSIGHT: must flatten as name/value pairs
var appInsightsLog = function(session,args) {
    
    // APPINSIGHT: put bot session and LUIS results into single object
    var data = Object.assign({}, session.message,args);
    
    // APPINSIGHT: ApplicationInsights Trace 
    console.log(data);

    // APPINSIGHT: Flatten data into name/value pairs
    flatten = function(x, result, prefix) {
        if(_.isObject(x)) {
            _.each(x, function(v, k) {
                flatten(v, result, prefix ? prefix + '_' + k : k)
            })
        } else {
            result["LUIS_" + prefix] = x
        }
        return result;
    }

    // APPINSIGHT: call fn to flatten data
    var flattenedData = flatten(data, {})

    // APPINSIGHT: send data to Application Insights
    appInsightsClient.trackEvent({name: "LUIS-results", properties: flattenedData});
}

// Add a dialog for each intent that the LUIS app recognizes.

bot.dialog('GreetingDialog',
    (session, args) => {        
        appInsightsLog(session,args);
        session.send('This is the Greetings intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Greeting'
})

bot.dialog('TotalAssetsDialog',
    (session, args) => {        
        // APPINSIGHT: Log results to Application Insights
        appInsightsLog(session,args);
        session.send('This is the \'Total assets\' intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Total assets'
})

bot.dialog('CheckTheBankCardBalance',
    (session) => {        
        session.send('This is the \'Check the bank card Balance\' intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Check the bank card Balance'
})

bot.dialog('ModifyPassword',
    (session) => {        
        session.send('This is the \'Modify password\' intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Modify password'
})

bot.dialog('AgentTransfer',
    (session) => {        
        session.send('This is the \'Agent transfer\' intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Agent transfer'
})

bot.dialog('MoneyTransfer', function (session, args) {
    // APPINSIGHT: Log results to Application Insights
        appInsightsLog(session,args);
    session.send('This is the \'Money Transfer\' intent. You said \'%s\'.', session.message.text);
    var money = builder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.currency');
    if (money) {
        session.send('Found money entity: \'%s\'', money.entity);
    }
    var name = builder.EntityRecognizer.findEntity(args.intent.entities, 'Communication.ContactName');
    if (name) {
        session.send('Found name entity: \'%s\'', name.entity);
    }
    session.endDialog();
}).triggerAction({
    matches: 'Money Transfer'
});