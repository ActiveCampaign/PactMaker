if (!~process.env.NODE.indexOf('heroku')) {
  // Only load dot env if it's not running on heroku
  require('dotenv').config()
}
const express = require('express')
const app = express()
const path = require('path')
const fs = require('fs')
const pdf = require('html-pdf');
const bodyParser = require('body-parser')
const ejs = require('ejs')
const _ = require('lodash')

// Cache agreement template
const agreement = fs.readFileSync(`${__dirname}/views/agreement.ejs`, 'utf8')

// Cache email subjects and content
const emailContentInternal = ejs.compile(fs.readFileSync(`${__dirname}/emails/internal.ejs`, 'utf8'))
const emailContentSignee = ejs.compile(fs.readFileSync(`${__dirname}/emails/signee.ejs`, 'utf8'))
const signeeSubject = ejs.compile(process.env.SIGNEE_EMAIL_SUBJECT || '')
const internalSubject = ejs.compile(process.env.INTERNAL_EMAIL_SUBJECT || '')

validateConfig()

const postmark = require('postmark')
const client = new postmark.Client(process.env.POSTMARK_SERVER_TOKEN)

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

const viewData = {
  title: process.env.TITLE || ''
}


/**
 * Index express route
 */
app.get('/', (req, res) => {
  res.render('index', viewData)
})


/**
 * Sign document express route
 */
app.post('/sign', (req, res) => {
  var template = ejs.compile(agreement)
  req.body.date = Date.now()

  createDocument(template(req.body), (pdfAgreement) => {
    req.body.agreement = pdfAgreement
    res.render('success', _.merge(viewData, req.body))

    sendEmails(req.body)
  })
})


/**
 * Start express server
 */
app.listen(process.env.PORT || 3000, () => console.log('PactMaker is up and running!'))


/**
 * Send emails to the signee and internal team
 * @param  {Object} data Request body data
 */
function sendEmails(data) {
  const attachment = {
    'Content': data.agreement,
    'Name': `${data.company}_${data.date}.pdf`,
    'ContentType': 'application/pdf'
  }

  // Send email to customer
  client.sendEmail({
    'From': process.env.POSTMARK_FROM_ADDRESS,
    'To': data.email,
    'Subject': signeeSubject(data),
    'HtmlBody': emailContentSignee(data),
    'Attachments': [attachment]
  }, (err, results) => {
    if (err) {
      console.error(err)
      return
    }

    console.log('Email sent:')
    console.log(results)
  })

  // Send email notification to internal team
  if (process.env.INTERNAL_EMAIL_RECIPIENTS) {
    const internalRecipients = process.env.INTERNAL_EMAIL_RECIPIENTS.split(',')

    internalRecipients.forEach((email) => {
      client.sendEmail({
        'From': process.env.POSTMARK_FROM_ADDRESS,
        'To': email,
        'Subject': internalSubject(data),
        'HtmlBody': emailContentInternal(data),
        'Attachments': [attachment]
      }, (err, results) => {
        if (err) {
          console.error(err)
          return
        }

        console.log('Email sent:')
        console.log(results)
      })
    })
  }
}


/**
 * Create PDF document
 * @param  {Object}   content  HTMl content content
 * @param  {Function} callback Callback containing the encoded PDF buffer
 */
function createDocument(content, callback) {
  pdf.create(content).toBuffer((err, buffer) => {
    callback(buffer.toString('base64'))
  })
}


/**
 * Validate heroku config
 */
function validateConfig() {
  if (!process.env.POSTMARK_FROM_ADDRESS) {
    throw Error('No From address specified in config')
  }
  if (!process.env.POSTMARK_SERVER_TOKEN) {
    throw Error('No Postmark server token specified in config')
  }
}
