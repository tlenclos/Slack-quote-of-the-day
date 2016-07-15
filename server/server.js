getAccessToken = function(userId) {
    try {
        var user = Meteor.users.findOne(userId);
        return user.services.slack.accessToken;
    } catch(e) {
        return null;
    }
};

slackMethod = function(options) {
    return function(args) {
        args = args || {};
        var token = args.token || getAccessToken(this.userId);
        if (!token) {
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
                return response.data;
            }
        } else {
            throw new Error("Received response code " + response.statusCode);
        }
    };
};

// Methods
Meteor.methods({
    // Slack API
    'slack-search': slackMethod({
        method: 'GET',
        url: 'https://slack.com/api/search.messages',
        parser: function (data) {
            return data.messages;
        }
    }),
    'slack-team': slackMethod({
        method: 'GET',
        url: 'https://slack.com/api/users.list',
        parser: function (data) {
            return data.members;
        }
    }),
    'slack-hook': function(teamId, text, title, emoji, channel) {
        var team = TeamCollection.findOne({id: teamId ? teamId :  Meteor.user().profile.team_id});
        if (!team || !team.webhook) {
            throw new Meteor.Error('No hook configured for this team');
        }

        var payload = {
            icon_emoji: emoji,
            username: title,
            text: text
        };

        if (channel) {
            payload.channel = channel;
        }

        HTTP.post(team.webhook, {
            data: payload
        });
    },
    // Quote / Hook
    'setHook': function(webhook) {
        if (!Meteor.user()) {
            throw new Meteor.Error('You must login with slack first');
        }

        if (!Roles.userIsInRole(Meteor.user(), ['admin'])) {
            throw new Meteor.Error('Not authorized');
        }

        check(webhook, String);

        var team = TeamCollection.findOne({id: Meteor.user().profile.team_id});
        if (!team) {
            throw new Meteor.Error('No team associated with this user');
        }

        TeamCollection.update(team._id, {$set:{webhook: webhook}});
    },
    'setQuote': function(quote) {
        if (!Meteor.user()) {
            throw new Meteor.Error('You must login with slack first');
        }

        var start = new Date();
        start.setHours(0);
        var end = new Date();
        end.setHours(23);
        var todayQuote = QuotesCollection.findOne({
            teamId: Meteor.user().profile.team_id,
            day: {
                $gte: start,
                $lte: end
            }
        });

        if (todayQuote) {
            throw new Meteor.Error('Only one quote is possible per day')
        }

        QuotesCollection.insert({
            quote: quote,
            day: new Date(),
            teamId: Meteor.user().profile.team_id
        });

        // Send message to slack channel
        Meteor.call('slack-hook', null, '"'+quote.text+'" par <@'+quote.username+'>', 'Quote of the day');

        return true;
    },
    // Quotes
    'deleteQuote': function(id) {
        check(id, String);
        QuotesCollection.remove({_id: id});
        return true;
    },
    'fetchTeamMember': function(user) {
        if (Match.test(user, String)) {
            user = Meteor.users.findOne(user);
        }

        var teamId = user.profile.team_id;
        var team = TeamCollection.findOne({id: teamId});

        if (!team) {
            // TODO Fetch team data
            TeamCollection.insert({id: teamId});

            // Fetch team meber
            Meteor.call('slack-team', {token: user.services.slack.accessToken}, function (error, members) {
                _.each(members, function (member) {
                    member.teamId = teamId;
                    TeamMemberCollection.insert(member);
                });
            });
        }
    },
    // Achievements
    'deleteAchievement': function(id) {
        check(id, String);
        AchievementsCollection.remove({_id: id});
        return true;
    },
    'unlockAchievement': function(data) {
        check(data, Schemas.achievementSelect); // TODO Display the error on the front
        TeamMemberCollection.update({ _id: data.userId },{ $addToSet: { achievements: data.achievement }});

        // Send message to slack channel
        var achievement = AchievementsCollection.findOne({_id: data.achievement});
        var user = TeamMemberCollection.findOne({_id: data.userId});

        Meteor.call('slack-hook', null, 'Par <@'+user.name+'>: "'+achievement.name+'" - '+achievement.description+'', 'Achievement unlocked');

        return true;
    },
    'removeAchievementForUser': function(achievementId, userId) {
        // TODO Security check team id of logged user
        TeamMemberCollection.update({ _id: userId },{ $pull: { achievements: achievementId }});
        return true;
    }
});

// Events
Accounts.onCreateUser(function(options, user) {
    if (options.profile) {
        user.profile = options.profile;
    }

    Meteor.call('fetchTeamMember', user);
    return user;
});

// Pub / sub
Meteor.publish('quoteOfTheDay', function (teamId) {
    // TODO Security check team id of logged user

    var start = new Date();
    start.setHours(0);
    start.setMinutes(0);
    start.setSeconds(0);
    var end = new Date();
    end.setHours(24);
    end.setMinutes(0);
    end.setSeconds(0);

    return QuotesCollection.find({
        teamId: teamId,
        day: {
            $gte: start,
            $lte: end
        }
    });
});

Meteor.publish('quotes', function (teamId) {
    // TODO Security check team id of logged user
    return QuotesCollection.find({
        teamId: teamId
    });
});

Meteor.publish('team', function (teamId) {
    // TODO Security check team id of logged user
    return TeamCollection.find({
        id: teamId
    });
});

Meteor.publish('members', function (teamId) {
    // TODO Security check team id of logged user
    return TeamMemberCollection.find({
        teamId: teamId
    });
});

Meteor.publish('member', function (teamId, userId) {
    // TODO Security check team id of logged user
    return TeamMemberCollection.find({
        teamId: teamId,
        _id: userId
    });
});

Meteor.publishComposite('achievements', function(teamId) {
    // TODO Security check team id of logged user

    return {
        find: function () {
            return AchievementsCollection.find({
                teamId: teamId
            });
        },
        children: [
            {
                find: function(achievement) {
                    return TeamMemberCollection.find({ achievements: {$in: [achievement._id]} });
                }
            }
        ]
    }
});

// API
// Global API configuration
var Api = new Restivus({
    prettyJson: true
});

// Ugly as fu..
Api.addRoute('quote/:_teamId', {
    get: function () {
        var quote = QuotesCollection.findOne({
            teamId: this.urlParams._teamId
        },
        {
            sort: {day: -1}
        });

        if (!quote) {
            return  {
                statusCode: 404,
                body: {status: 'fail', message: 'Quote not found'}
            }
        }

        return quote;
    }
});


// Flower power
var callForWaterAndUpdateFlower = function(flower) {
    Meteor.call('slack-hook', process.env.DEFAULT_SLACK_TEAM, flower.name+' a soif !', 'JoliGarden', ':seedling:', '#joligarden');
    FlowersCollection.update({ _id: flower._id }, {$set: {latestCallForWater: new Date()}});
}

// Cronjob to call api when a plant is thirsty
SyncedCron.add({
    name: 'Send call for water for flowers in slack',
    schedule: function(parser) {
        return parser.recur().every(1).hour();
    },
    job: function() {
        var flowers = FlowersCollection.find().fetch();
        var date = new Date();

        _.each(flowers, function (flower) {
            if (!flower.latestCallForWater) {
                // Call slack API
                callForWaterAndUpdateFlower(flower);
            } else {
                // Avoid 1 hour offset due to some milliseconds of difference
                var latestCallForWater = flower.latestCallForWater;
                latestCallForWater.setSeconds(0);
                latestCallForWater.setMilliseconds(0);
                
                // Diff dates
                var days = (date - latestCallForWater) / (1000*60*60*24);
                if (days >= flower.waterNeedsDayInterval) {
                    callForWaterAndUpdateFlower(flower);
                }
            }
        });

        return 'ok';
    }
});

SyncedCron.start();
