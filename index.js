const express = require('express')
const app = express()
const path = require('path')
const fs = require('fs')
const HTMLToPDF = require('html5-to-pdf')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const _ = require('lodash')

const agreement = fs.readFileSync(`${__dirname}/views/agreement.ejs`, 'utf8')
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
  console.log('Start signing')
  var template = ejs.compile(agreement)
  req.body.filename = `/agreements/${req.body.company}_${Date.now()}.pdf`;
  req.body.date = Date.now()

  console.log(template)

  createDocument(req.body.filename, template(req.body), () => {
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
    'Content': fs.readFileSync(`${__dirname}/public${data.filename}`).toString('base64'),
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

function createDocument(filename, body, callback) {
  console.log('Create document')
  const htmlToPDF = new HTMLToPDF({
    inputBody: body,
    outputPath: `${__dirname}/public${filename}`,
  })

  htmlToPDF.build((error) => {
    if(error) throw error

    console.log('Build...')

    callback()
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
