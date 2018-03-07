<h1 align="center">
  <img width="200" src="media/logo.svg" alt="PactMaker">
  <br>
  <br>
</h1>

>Starter workflow for creating self-signed PDF agreements. [Check out the demo](https://pactmaker.herokuapp.com).


[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

PactMaker collects form data and generates a signed PDF agreement between you and your users. Once generated, it emails the PDF using [Postmark](https://postmarkapp.com) to your user and team. PactMaker is built with node.js, express, and EJS templating.

![PactMaker Screenshot](media/screenshot.png)

## Configuration
Create an environment variable file(`.env`) in the project root with the following variables:

```
POSTMARK_SERVER_TOKEN=''
POSTMARK_FROM_ADDRESS=''
INTERNAL_EMAIL_RECIPIENTS=''
INTERNAL_EMAIL_SUBJECT=''
SIGNEE_EMAIL_SUBJECT=''
TITLE=''
```

#### `POSTMARK_SERVER_TOKEN`
Server tokens can be found under the credentials tab on your Postmark server.

#### `POSTMARK_FROM_ADDRESS`
The email address you want to send the email from. You must verify your domain or create a valid Sender Signature on Postmark.

#### `INTERNAL_EMAIL_RECIPIENTS`
Comma-separated list of email address you want to send the PDF agreement to.

#### `INTERNAL_EMAIL_SUBJECT`
The subject line of the email that gets sent to your team. Available variables: `<%= company %>`, `<%= name %>`, `<%= role %>`, and `<%= email %>`.

#### `SIGNEE_EMAIL_SUBJECT`
The subject line of the email that gets sent to the person who just signed the agreement. Available variables: `<%= company %>`, `<%= name %>`, `<%= role %>`, and `<%= email %>`.

#### `TITLE`
The name of your company or app that appears on the page header and footer.

## Get started
Before you get started make sure you create an environment variable file.
* `npm install`
* `npm start` or `heroku local`

## Email templates
The email content for the signee and internal email can be found under [`/emails`]((emails)). Templates are rendered using [EJS](http://www.embeddedjs.com/). Available variables: `<%= company %>`, `<%= name %>`, `<%= role %>`, and `<%= email %>`.

## Agreement template
The agreement PDF template can be found at [`/views/agreement.ejs`](views/agreement.ejs). PactMaker comes with basic styles for presenting different signatures.
