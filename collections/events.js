// ======== DB-Model: ========
// "_id" -> ID
// "title" -> string
// "description" -> string
// "mentors" -> [userIDs]   optional
// "startdate" -> ISODate
// "host" -> [userIDs]     optional
// "location" -> ...............
// "createdby" -> userId
// "time_created" -> timestamp
// "time_lastedit" -> timestamp
// "course_id" -> ID_course          (maybe list in Future)
// ===========================

Events = new Meteor.Collection("Events");


Events.allow({
	update: function (userId, doc, fieldNames, modifier) {
		return userId && true;	// allow only if UserId is present
	},
	insert: function (userId, doc) {
		return userId && true;	// allow only if UserId is present
	},
	remove: function (userId, doc) {
		return userId && true;	// allow only if UserId is present
	}
});

eventsFind = function(fromDate, limit) {
	var find = { 
		startdate: { $gt: fromDate }
	};

	var options = { 
		limit: limit,
		sort: { startdate: 1 } 
	};

	return Events.find(find, options);
} 