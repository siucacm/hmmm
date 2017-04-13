Template.userFrame.onCreated(function() {
	this.forgot = new ReactiveVar(false);
});

Template.userFrame.helpers({
	forgot: function() {
		return !Meteor.user() && Template.instance().forgot.get();
	},

	login: function() {
		return !Meteor.user() && !Template.instance().forgot.get();
	}
});

/** Setup (re-)setting of login/register warnings for a template
  *
  * @param {Object} template
  * @param {Array}  warnings - an array containing objects obtaining the different
  *                            warning messages, depending on the type of error
  */
var warnings = function(template, warnings) {
	template.onCreated(function() {
		var instance = this;
		instance.hasWarning = new ReactiveVar(false);

		instance.resetWarnings = function() {
			instance.$('.form-group').removeClass('has-error');
			instance.$('.warning-block').remove();
		};

		instance.setWarning = function(warningID) {
			if (instance.hasWarning.get()) instance.resetWarnings();

			var warning = _.findWhere(warnings, {_id: warningID});

			var selectors = warning.selectors;
			_.each(selectors, function(selector, index) {
				var formGroup = $(selector).parents('.form-group');
				formGroup.addClass('has-error');

				if (index === selectors.length - 1) {
					formGroup.append(
						'<span class="help-block warning-block">'
						+ warning.text
						+ '</span>'
					);
				}
			});

			instance.hasWarning.set(true);
		};
	});
};

warnings(Template.loginFrame, [
	{ _id: 'noUserName'
	, text: mf('login.warning.noUserName', 'Please enter your username or email to log in.')
	, selectors: ['#loginName']
	}
	,
	{ _id: 'noCredentials'
	, text: mf('login.login.warning', 'Please enter your username or email and password to log in.')
	, selectors: ['#loginName', '#loginPassword']
	}
	,
	{ _id: 'noPassword'
	, text: mf('login.password.password_incorrect', 'Incorrect password')
	, selectors: ['#loginPassword']
	}
	,
	{ _id: 'userNotFound'
	, text: mf('login.username.usr_doesnt_exist', 'This user does not exist.')
	, selectors: ['#loginName']
	}
]);

Template.loginFrame.events({
	'click .js-forgot-pwd-btn': function(event, instance) {
		instance.parentInstance().forgot.set(true);
		return false;
	},

	'click .js-register-open': function(event, instance) {
		var name = instance.$('#loginName').val();
		var password = instance.$('#loginPassword').val();
		var email;

		// Sometimes people register with their email address in the first field
		// Move entered username over to email field if it contains a @
		var atPos = name.indexOf('@');
		if (atPos >= 0) {
			email = name;
			name = name.substr(0, atPos);
		}

		$('#registerName').val(name);
		$('#registerPassword').val(password);
		$('#registerEmail').val(email);
	},

	'submit form, click .js-login': function(event, instance){
		event.preventDefault();
		var user = instance.$('#loginName').val();
		var password = instance.$('#loginPassword').val();
		Meteor.loginWithPassword(user, password, function(err) {
			if (err) {
				var reason = err.reason;
				if (reason == 'Match failed') {
					instance.setWarning(!instance.$('#loginPassword').val()
						? 'noCredentials'
						: 'noUserName');
				}

				if (reason == 'Incorrect password') {
					instance.setWarning('noPassword');
				}

				if (reason == 'User not found') {
					instance.setWarning('userNotFound');
				}
			} else {
				$('.loginButton').dropdown('toggle');
			}
		});
	},

	'click .js-external-service-login-btn': function(event, instance) {
		event.preventDefault();

		var loginMethod = 'loginWith' + event.currentTarget.dataset.service;
		if (!Meteor[loginMethod]) {
			console.log("don't have "+loginMethod);
			return;
		}
		Meteor[loginMethod]({
		}, function (err) {				// console.log(err.reason);

			if (err) {
				addMessage(err.reason || 'Unknown error', 'danger');
			} else {
				$('.loginButton').dropdown('toggle');
			}
		});
	}
});

Template.registerModal.events({
	'click .js-close': function(event, instance){
		instance.$('#registerFrame').modal('hide');
	}
});

warnings(Template.registerFrame, [
	{ _id: 'noUserName'
	, text: mf('register.warning.noUserName', 'Please enter a name for your new user.')
	, selectors: ['#registerName']
	}
	,
	{ _id: 'noPassword'
	, text: mf('register.warning.noPasswordProvided', 'Please enter a password to register.')
	, selectors: ['#registerPassword']
	}
	,
	{ _id: 'noCredentials'
	, text: mf('register.warning.noCredentials', 'Please enter a username and a password to register.')
	, selectors: ['#registerName', '#registerPassword']
	}
	,
	{ _id: 'userExists'
	, text: mf('register.warning.userExists', 'This username already exists. Please choose another one.')
	, selectors: ['#registerName']
	}
]);

Template.registerFrame.onRendered(function() {
	var instance = this;

	$('#registerFrame').on('hide.bs.modal', function() {
		instance.resetWarnings();
	});
});

Template.registerFrame.events({
	'click .js-register': function(event, instance) {
		event.preventDefault();

		var name = instance.$('#registerName').val();
		var password = instance.$('#registerPassword').val();
		var email = instance.$('#registerEmail').val();

		Accounts.createUser({
			username: name,
			password: password,
			email: email
		}, function (err) {
			if (err) {
				var reason = err.reason;
				if (reason == 'Need to set a username or email') {
					instance.setWarning('noUserName');
				}

				if (reason == 'Password may not be empty') {
					instance.setWarning(!instance.$('#registerName').val()
						? 'noCredentials'
						: 'noPassword');
				}

				if (reason == 'Username already exists.') {
					instance.setWarning('userExists');
				}
			} else {
				$('#registerFrame').modal('hide');
				var regionId = cleanedRegion(Session.get('region'));
				if (regionId) {
					Meteor.call('user.regionChange', regionId);
				}
			}
		});
	}
});

Template.forgotPwdFrame.onCreated(function() {
	this.emailIsValid = new ReactiveVar(false);
});

Template.forgotPwdFrame.helpers({
	noValidEmail: function() {
		return !Template.instance().emailIsValid.get();
	}
});

Template.forgotPwdFrame.events({
	'keyup #resetPwdEmail': function(event, instance) {
		var resetPwdEmail = $(event.currentTarget).val();
		var emailIsValid = ~resetPwdEmail.indexOf('@');

		instance.emailIsValid.set(emailIsValid);
	},

	'submit .js-reset-pw': function(event, instance) {
		event.preventDefault();
		Accounts.forgotPassword({
			email: instance.$('.js-login-email').val()
		}, function(err) {
			if (err) {
				showServerError('We were unable to send a mail to this address', err);
			} else {
				addMessage(mf('forgot.sent', "we sent a mail with instructions"), 'success');
				instance.forgot.set(false);
			}
		});
		return false;
	},

	'click .js-reset-pwd-close-btn': function(event, instance) {
		instance.parentInstance().forgot.set(false);
		return false;
	},
});

Template.ownUserFrame.events({
	'click .js-logout': function(event){
		event.preventDefault();
		Meteor.logout();

		var routeName = Router.current().route.getName();
		if (routeName === 'profile') Router.go('userprofile', Meteor.user());
		return false;
	},
});
