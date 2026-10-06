# Kestrel Cycle Hire: a site with forms to review

A made-up bike hire shop has a small site: a home page with a search form and a newsletter form, an account sign-up
page and a login page, and a booking page with a delivery address, a list of pick-up points and card details. The
team wants a list of what to look at in its forms before a UX review. The pages hold what such a list finds:

- the search field has no label at all, and the search button holds only an icon with no name;
- the newsletter field is a text field named by its placeholder alone, for an email address, with no autocomplete;
- on the sign-up page, a label says "First name *" on a field that is not marked as required, a required field and a
  required check box say nothing, the phone field is a text field with `autocomplete="phone"`, which is not a token, the
  email field points `aria-describedby` at a hint that is not there, the password field has `autocomplete="off"`, an
  error message sits next to it with no link to it, the second password field repeats the id of the first so that its
  label reaches the first one, two radio buttons have no question around them, and two elements have a tabindex above 0;
- on the login page, the form and the email field have `autocomplete="off"`, the password field has no token, and the
  form is sent by a span with a click handler, with no submit button;
- on the booking page, the number of riders is a text field, the street address has no token, the postcode has a
  pattern of digits with a full keyboard, the website field is a text field, the list of pick-up points has 36 options,
  the card number has no numeric keyboard and points `aria-errormessage` at a message that is not there, the expiry has
  an inputmode that does not exist, and the security code has a pattern on a number field.

It also holds what must not be reported: a form in a comment and one written by a script on the home page, a hint that
is linked on the sign-up page, a demo page under `node_modules`, and the folder `vendor`, which `../config.json` leaves
out with `"exclude": ["vendor/**"]`. `../config.json` also lowers `optionLimit` to 30, so the list of 36 pick-up points
is noted.

```
node bin/form-ux-check.js examples/messy --config examples/config.json
```

The company, the site, the station names and every person are made up. The pages are made-up input for the tool, not
code of this repository.
