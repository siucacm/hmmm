Template.layout.helpers({
	testWarning: function() {
		return Meteor.settings && Meteor.settings.public && Meteor.settings.public.testWarning;
	},
	translate: function() {
		var route = Router.current().route;
		return route && route.getName() === "mfTrans";
	},

	mayTranslate: function() {
		return !!Meteor.user();
	}
});

Template.layout.rendered = function() {
	$(window).resize(function(event){ getViewportWidth(); });
	Session.set('isRetina', (window.devicePixelRatio == 2));
};


/* Workaround to prevent iron-router from messing with server-side downloads
 *
 * Class 'js-download' must be added to those links.
 */
var stopPropagationForDownloadClicks = {
	'click .js-download': function(event, instance) {
		event.stopPropagation();
	}
};

Template.layout.events(stopPropagationForDownloadClicks);
Template.frameLayout.events(stopPropagationForDownloadClicks);