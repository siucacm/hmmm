"use strict";

Router.map(function() {
	this.route('venueDetails', {
		path: 'venue/:_id/:name?',
		waitOn: function () {
			return [
				Meteor.subscribe('venueDetails', this.params._id),
				Meteor.subscribe('eventsFind', { venue: this.params._id })
			];
		},

		data: function() {
			var id = this.params._id;

			var venue;
			var data = {};
			if (id === 'create') {
				var userId = Meteor.userId();
				venue = new Venue();
				venue.region = cleanedRegion(Session.get('region'));
				venue.editor = userId;
			} else {
				venue = Venues.findOne({_id: this.params._id});
				if (!venue) return false; // Not found

				data.eventsList = eventsFind({venue: id, after: minuteTime.get()}, 12);
			}

			data.venue = venue;

			return data;
		},

		onAfterAction: function() {
			var data = this.data();
			if (!data) return;

			var venue = data.venue;
			var title;
			if (venue._id) {
				title = venue.name;
			} else {
				title = mf('venue.edit.siteTitle.create', "Create Venue");
			}
			document.title = webpagename + title;
		}
	});
});



/////////////////////////////////////////////////// map

Template.venueDetails.onCreated(function() {
	var isNew = !this.data.venue._id;
	this.editing = new ReactiveVar(isNew);

	var markers = new Meteor.Collection(null);
	this.markers = markers;

	this.setLocation = function(loc) {
		markers.remove({ main: true });
		if (loc) {
			markers.insert({
				loc: loc,
				main: true
			});
		}
	};

	this.setRegion = function(region) {
		markers.remove({ center: true });
		if (region && region.loc) {
			markers.insert({
				loc: region.loc,
				center: true
			});
		}
	};
});

Template.venueDetails.onRendered(function() {
	var instance = this;

	instance.autorun(function() {
		var data = Template.currentData();

		instance.setLocation(data.venue.loc);

		var region = Regions.findOne(data.venue.region);
		instance.setRegion(region);
	});
});


Template.venueDetails.helpers({
	editing: function () {
		return Template.instance().editing.get();
	},

	mayEdit: function () {
		return this.editableBy(Meteor.user());
	},

	markers: function() {
		return Template.instance().markers;
	},

	coords: function() {
		if (this.loc && this.loc.coordinates) {
			var fmt = function(coord) {
				var sign = '';
				if (coord > 0) sign = '+';
				if (coord < 0) sign = '-';
				return sign + coord.toPrecision(6);
			};
			var coords = {
				LAT: fmt(this.loc.coordinates[1]),
				LON: fmt(this.loc.coordinates[0]),
			};

			return mf('venueDetails.coordinates', coords, "Coordinates: {LAT} {LON}");
		}
	},

	facilityNames: function() {
		return Object.keys(this.facilities);
	}
});


Template.venueDetails.events({
	'click .js-venue-edit': function(event, instance) {
		instance.editing.set(true);
	},

	'click .js-venue-delete': function(event, instance) {
		if (confirm(mf("venue.detail.remove", "Remove venue?"))) {
			var venue = instance.data.venue;
			Meteor.call('venue.remove', venue._id, function(err, result) {
				if (err) {
					showServerError('Deleting the venue went wrong', err);
				} else {
					addMessage(mf('venue.removed', { NAME: venue.name }, 'Removed venue "{NAME}".'), 'success');
					Router.go('venues');
				}
			});
		}
	}

});
