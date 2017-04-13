
getMember = function(members, user) {
	if (!members) return false;
	var member = false;
	members.forEach(function(member_candidate) {
		if (member_candidate.user == user) {
			member = member_candidate;
			return true; // break
		}
	});
	return member;
};


/* Get a username from ID
 */
userName = function() {
	// We cache the username lookups
	// To prevent unlimited cache-growth, after a enough lookups we
	// build a new cache from the old
	var cacheLimit = 1000;
	var cache = {};
	var previousCache = {};
	var lookups = 0;
	var pending = {};

	// Update the cache if users are pushed to the collection
	Meteor.users.find().observe({
		'added': function(user) {
			cache[user._id] = user.username;
		},
		'changed': function(user) {
			cache[user._id] = user.username;
		}
	});

	return function(userId) {
		if (!userId) return mf('noUser_placeholder', 'someone');

		// Consult cache
		var user = cache[userId];
		if (user === undefined) {
			// Consult old cache
			user = previousCache[userId];

			// Carry to new cache if it was present in the old
			if (user !== undefined) {
				cache[userId] = user;
			}
		}

		if (user === undefined) {
			// Substitute until the name (or its absence) is loaded
			user = '?!';

			if (pending[userId]) {
				pending[userId].depend();
			} else {
				// Cache miss, now we'll have to round-trip to the server
				lookups += 1;
				pending[userId] = new Tracker.Dependency();
				pending[userId].depend();

				// Cycle the cache if it's full
				if (cacheLimit < lookups) {
					previousCache = cache;
					cache = {};
					lookups = 0;
				}

				Meteor.call('user.name', userId, function(err, user) {
					if (err) {
						console.warn(err);
					}
					if (user) {
						cache[userId] = user;
						pending[userId].changed();
						delete pending[userId];
					}
				});
			}
		}

		if (user) {
			return user;
		} else {
			return "userId: " + userId;
		}
	};
}();


/* Go to the same page removing query parameters */
goBase = function() {
	Router.go(Router.current().route.name, Router.current().params); // Shirely, you know of a better way?
};


pleaseLogin = function() {
	if (Meteor.userId()) return false;
	alert(mf('Please.login', 'Please login or register'));

	var viewportWidth = Session.get('viewportWidth');
	var screenSM = SCSSVars.screenSM;
	if (viewportWidth <= screenSM) {
		$('.collapse').collapse('show');
	}

	setTimeout(function(){
		$('.loginButton').dropdown('toggle');    //or $('.dropdown').addClass('open');
	},0);
	return true;
};

markedName = function(search, name) {
	if (search === '') return name;
	var match = name.match(new RegExp(search, 'i'));

	// To add markup we have to escape all the parts separately
	var marked;
	if (match) {
		var term = match[0];
		var parts = name.split(term);
		marked = _.map(parts, Blaze._escape).join('<strong>'+Blaze._escape(term)+'</strong>');
	} else {
		marked = Blaze._escape(name);
	}
	return Spacebars.SafeString(marked);
};

getViewportWidth = function() {
	var viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	Session.set('viewportWidth', viewportWidth);
};


courseFilterPreview = function(options) {
	var selector = options.selector;
	var activate = options.activate;
	var instance = options.instance || false;
	var delayed = options.delayed || false;

	var filterClass = delayed
		? 'filter-no-match-delayed'
		: 'filter-no-match';

	var course = instance
		? instance.$('.course-compact')
		: $('.course-compact');

	course
		.not(selector)
		.toggleClass(filterClass, activate);
};


showServerError = function(message, err) {
	addMessage(mf('_serverError', { ERROR: err, MESSAGE: message}, 'There was an error on the server: "{MESSAGE} ({ERROR})." Sorry about this.'), 'danger');
};

var subbedGroup = function(group) {
	var groupId = ''+group; // it's not a string?! LOL I DUNNO
	miniSubs.subscribe('group', groupId);
	return Groups.findOne(groupId);
};


groupNameHelpers = {
	short: function() {
		if (!this) return;
		var group = subbedGroup(this);
		if (!group) return "-";
		return group.short;
	},
	name: function() {
		if (!this) return;
		var group = subbedGroup(this);
		if (!group) return mf('group.missing', "Group does not exist");
		return group.name;
	},
};

/** Use null instead of 'all' to mean "All regions".
  * This is needed until all instances where we deal with regions are patched.
  */
cleanedRegion = function(region) {
	return region === 'all' ? null : region;
};

TemplateMixins = {
	/** Setup expand/collaps logic for a template
	*
	* @param {Object} template instance
	*
	* This mixin extends the given template with an `expanded` helper and
	* two click handlers `js-expand` and `js-close`. Only one expandible template
	* can be open at a time, so don't nest them.
	*
	* Example:
	* <template name="pushIt">
	*   <div>
	*     {{#if expanded}}
	*       All this content hiding here.
	*       Now close it again!
	*       <button type="button" class="js-collapse">CLOSE IT!</button>
	*     {{else}}
	*       Press the button!
	*       <button type="button" class="js-expand">OPEN IT!</button>
	*     {{/if}}
	*   </div>
	* </template>
	*/
	Expandible: function(template) {
		template.onCreated(function() {
			var expander = Random.id(); // Token to keep track of which Expandible is open
			this.expander = expander;
			this.collapse = function() {
				if (Session.equals('verify', expander)) {
					Session.set('verify', false);
				}
			};
		});
		template.helpers({
			'expanded': function() {
				return Session.equals('verify', Template.instance().expander);
			}
		});
		template.events({
			'click .js-expand': function(event, instance) {
				Session.set('verify', instance.expander);
				event.stopPropagation();
			},
			'click .js-collapse': function(event, instance) {
				Session.set('verify', false);
			},
		});
	},

	/** Setup disabling of save buttons for a template
	  *
	  * @param {Object} template instance
	  *
	  * The template instance gains a saving() method to set saving status and
	  * a helper that returns {saving} status.
	  */
	Saving: function(template) {
		var saving = new ReactiveVar(false);

		template.onCreated(function() {
			this.saving = function(val) {
				saving.set(!!val);
			};
		});

		template.helpers({
			'saving': function() {
				return saving.get();
			}
		});
	}
};


/*************** HandleBars Helpers ***********************/

Template.registerHelper ("siteName", function() {
	if (Meteor.settings.public && Meteor.settings.public.siteName) {
		return Meteor.settings.public.siteName;
	}
	return "Hmmm";
});

Template.registerHelper ("siteStage", function() {
	if (Meteor.settings.public && Meteor.settings.public.siteStage) {
		return Meteor.settings.public.siteStage;
	}
	return "";
});


Template.registerHelper ("categoryName", function() {
	Session.get('locale'); // Reactive dependency
	return mf('category.'+this);
});

Template.registerHelper ("privacyEnabled", function(){
	var user = Meteor.user();
	if(!user) return false;
	return user.privacy;
});


Template.registerHelper("log", function(context) {
	if (window.console) console.log(arguments.length > 0 ? context : this);
});


Template.registerHelper('username', userName);


Template.registerHelper('currentLocale', function() {
	return Session.get('locale');
});

Template.registerHelper('now', function(){
	return moment(new Date());
});

Template.registerHelper('backArrow', function() {
	var isRTL = Session.get('textDirectionality') == 'rtl';
	var direction = isRTL ? 'right' : 'left';
	return Spacebars.SafeString(
		'<span class="fa fa-arrow-' + direction + ' fa-fw" aria-hidden="true"></span>'
	);
});

Template.registerHelper('dateformat', function(date) {
	Session.get('timeLocale');
	if (date) return moment(date).format('L');
});

Template.registerHelper('dateLong', function(date) {
	if (date) {
		Session.get('timeLocale');
		date = moment(moment(date).toDate());
		return moment(date).format('LL');
	}
});

Template.registerHelper('weekNr', function(date) {
	if (date) {
		Session.get('timeLocale');
		date = moment(moment(date).toDate());
		return moment(date).week();
	}
});


Template.registerHelper('dateformat_calendar', function(date) {
	Session.get('timeLocale'); // it depends
	if (date) return moment(date).calendar();
});

Template.registerHelper('dateformat_withday', function(date) {
	Session.get('timeLocale'); // it depends
	if (date) return moment(date).format('ddd D.MM.YYYY');
});

Template.registerHelper('weekday', function(date) {
	Session.get('timeLocale'); // it depends
	if (date) return moment(date).format('dddd');
});

Template.registerHelper('weekday_short', function(date) {
	Session.get('timeLocale'); // it depends
	if (date) return moment(date).format('ddd');
});

Template.registerHelper('dateformat_fromnow', function(date) {
	Session.get('fineTime');
	Session.get('timeLocale'); // it depends
	if (date) return moment(date).fromNow();
});

Template.registerHelper('fullDate', function(date) {
	Session.get('timeLocale'); // it depends
	if (date) return moment(date).format('ddd D.MM.YYYY HH:mm');
});


Template.registerHelper('dateformat_mini', function(date) {
	if (date) return moment(date).format('D.M.');
});

Template.registerHelper('dateformat_mini_fullmonth', function(date) {
	Session.get('timeLocale'); // it depends
	if (date) {
		var m = moment(date);
		var year = m.year() != moment().year() ? " " + m.format('YYYY') : '';
		return moment(date).format('D. MMMM') + year;
	}
});

Template.registerHelper('timeformat', function(date) {
	Session.get('timeLocale');
	if (date) return moment(date).format('LT');
});

Template.registerHelper('fromNow', function(date) {
	Session.get('fineTime');
	Session.get('timeLocale'); // it depends
	if (date) return moment(date).fromNow();
});


Template.registerHelper('isNull', function(val) {
	return val === null;
});

Template.registerHelper('courseURL', function(_id) {
	var course=Courses.findOne(_id);
	var name = getSlug(course.name);
	return '/course/' + _id + '/' + name;
});


// Strip HTML markup
Template.registerHelper('plain', function(html) {
	var div = document.createElement('div');
	div.innerHTML = html;
	return div.textContent || div.innerText || '';
});

// Take a plain excerpt from HTML text
// If the output is truncated to len, an ellipsis is added
Template.registerHelper('plainExcerpt', function(html, len) {
	html = html || '';
	var div = document.createElement('div');
	div.innerHTML = html;
	var s = div.textContent || div.innerText || '';

	// Condense runs of whitespace so counting characters won't be too far off
	s = s.replace(/\s+/, " ");

	if (s.length <= len) return s;
	return s.substring(0, len)+'…';
});

Template.registerHelper ("venueName", function(venueId) {
	var venue = Venues.findOne(venueId);
	if (!venue) return '';
	return venue.name;
});

// http://stackoverflow.com/questions/27949407/how-to-get-the-parent-template-instance-of-the-current-template
/**
 * Get the parent template instance
 * @param {Number} [levels] How many levels to go up. Default is 1
 * @returns {Blaze.TemplateInstance}
 */

Blaze.TemplateInstance.prototype.parentInstance = function (levels) {
    var view = Blaze.currentView;
    if (typeof levels === "undefined") {
        levels = 1;
    }
    while (view) {
        if (view.name.substring(0, 9) === "Template." && !(levels--)) {
            return view.templateInstance();
        }
        view = view.parentView;
    }
};

Template.registerHelper('groupShort', function(groupId) {
	var instance = Template.instance();
	instance.subscribe('group', groupId);

	var group = Groups.findOne({ _id: groupId });
	if (group) return group.short;
	return "";
});

Template.registerHelper('groupLogo', function(groupId) {
	var instance = Template.instance();
	instance.subscribe('group', groupId);

	var group = Groups.findOne({ _id: groupId });
	if (group) {
		if (group.logo){
			return group.logo;
		} return "";
	}
	return "";
});
