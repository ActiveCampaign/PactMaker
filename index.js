const express = require('express')
const app = express()
const path = require('path')
const fs = require('fs')
const HTMLToPDF = require('html5-to-pdf')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const _ = require('lodash')

const agreement = fs.readFileSync(`${__dirname}/views/agreement.ejs`, 'utf8')
console.log(agreement)
const emailContentInternal = ejs.compile(fs.readFileSync(`${__dirname}/emails/internal.ejs`, 'utf8'))
const emailContentSignee = ejs.compile(fs.readFileSync(`${__dirname}/emails/signee.ejs`, 'utf8'))

validateConfig()

const postmark = require('postmark')
const client = new postmark.Client(process.env.POSTMARK_SERVER_TOKEN)

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

const viewData = {
  title: process.env.TITLE || ''
}


// Routes
app.get('/', (req, res) => {
  res.render('index', viewData)
})

app.post('/sign', (req, res) => {
  var template = ejs.compile(agreement)
  req.body.date = Date.now()

  createDocument(template(req.body), (pdfAgreement) => {
    req.body.agreement = pdfAgreement
    res.render('success', _.merge(viewData, req.body))
    sendEmails(req.body)
  })
})

// Start server
app.listen(process.env.PORT || 3000, () => console.log('PactMaker is up and running!'))


function sendEmails(data) {
  const signeeSubject = ejs.compile(process.env.SIGNEE_EMAIL_SUBJECT || '')
  const internalSubject = ejs.compile(process.env.INTERNAL_EMAIL_SUBJECT || '')
  const attachment = {
    'Content': data.agreement,
    'Name': `${data.company}_${data.date}.pdf`,
    'ContentType': 'application/pdf'
  }

  // Send email to customer
  client.sendEmail({
    'From': process.env.FROM_ADDRESS,
    'To': data.email,
    'Subject': signeeSubject(data),
    'HtmlBody': emailContentSignee(data),
    'Attachments': [attachment]
  })

  // Send email notification to internal team
  if (process.env.INTERNAL_EMAIL_RECIPIENTS) {
    const internalRecipients = process.env.INTERNAL_EMAIL_RECIPIENTS.split(',')

    internalRecipients.forEach((email) => {
      client.sendEmail({
        'From': process.env.FROM_ADDRESS,
        'To': email,
        'Subject': internalSubject(data),
        'HtmlBody': emailContentInternal(data),
        'Attachments': [attachment]
      })
    })
  }

}

function createDocument(body, callback) {
  const htmlToPDF = new HTMLToPDF({ inputBody: body })

  htmlToPDF.build((error, buffer) => {
    if(error) throw error

    callback(buffer.toString('base64'))
  })
}

function validateConfig() {
  if (!process.env.FROM_ADDRESS) {
    throw Error('No From address specified in config')
  }
  if (!process.env.POSTMARK_SERVER_TOKEN) {
    throw Error('No Postmark server token specified in config')
  }
}
