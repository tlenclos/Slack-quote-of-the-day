getAccessToken = function(userId) {
    try {
        var user = Meteor.users.findOne(userId);
        return user.services.slack.accessToken;
    } catch(e) {
        return null;
    }
};

slackMethod = function(options){
    return function(args) {
        args = args || {};
        var token = args.token || getAccessToken(this.userId);
        if (!token){
            throw new Error("User is not authenticated with Slack");
        }

        _.extend(args, {token: token});
        console.log('args', args);

        var response;
        try {
            response = HTTP.call(options.method, options.url,{
                params: args
            });
        } catch (e) {
            console.log('Request Error', e);
            throw new Error("Request Error");
        }


        console.log('response', response);
        if (response.statusCode === 200) {
            if (options.parser){
                return options.parser(response.data);
            } else {
                return response.data.channels;
            }
        } else {
            throw new Error("Recieved response code " + response.statusCode);
        }
    };
}


Meteor.methods({
    'slack-search': slackMethod({
        method: 'GET',
        url: 'https://slack.com/api/search.messages',
        parser: function (data) {
            return data.messages;
        }
    }),
    'setQuote': function(quote) {
        QuotesCollection.insert({quote: quote, day: new Date()});
    }
});
