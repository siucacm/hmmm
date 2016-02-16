Router.map(function () {
	this.route('eventlines', {
		path: '/kiosk/eventlines',
		template: 'eventLines',
		layoutTemplate: 'eventLinesLayout',
		waitOn: function () {
			return subs.subscribe('eventsFind', {after:minuteTime.get()}, 20);
		},
		data: function() {
			return eventsFind({after:minuteTime.get()}, 10);
		},
		onAfterAction: function() {
			document.title = webpagename + 'Kiosk/eventLines';
		}
	});
});




Template.eventLines.rendered = function() {
	this.$('.title').dotdotdot({
	});
	this.$('.room').dotdotdot({
	});
};


