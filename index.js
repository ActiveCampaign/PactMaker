const express = require('express')
const app = express()
const path = require('path')
const fs = require('fs')
const HTMLToPDF = require('html5-to-pdf')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const _ = require('lodash')
const config = require('./config')

const agreement = fs.readFileSync(`${__dirname}/views/agreement.ejs`, 'utf8')
const emailContentInternal = ejs.compile(fs.readFileSync(`${__dirname}/emails/internal.ejs`, 'utf8'))
const emailContentSignee = ejs.compile(fs.readFileSync(`${__dirname}/emails/signee.ejs`, 'utf8'))

const postmark = require('postmark')
const client = new postmark.Client(config.email.postmarkServerToken)

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

const viewData = {
  title: config.title
}

// Routes
app.get('/', (req, res) => {
  res.render('index', viewData)
})

app.post('/sign', (req, res) => {
  var template = ejs.compile(agreement)
  req.body.filename = `/agreements/${req.body.company}_${Date.now()}.pdf`;
  req.body.date = Date.now()

  createDocument(req.body.filename, template(req.body), () => {
    res.render('success', _.merge(viewData, req.body))
    // sendEmails(req.body)
  })
})

// Start server
app.listen(3000, () => console.log('Example app listening on port 3000!'))


function sendEmails(data) {
  const signeeSubject = ejs.compile(config.email.signee.subject)
  const internalSubject = ejs.compile(config.email.internal.subject)
  const attachment = {
    'Content': fs.readFileSync(`./public${data.filename}`).toString('base64'),
    'Name': `${data.company}_${data.date}.pdf`,
    'ContentType': 'application/pdf'
  }

  // Send email to customer
  client.sendEmail({
    'From': config.email.fromAddress,
    'To': data.email,
    'Subject': signeeSubject(data),
    'HtmlBody': emailContentSignee(data),
    'Attachments': [attachment]
  })

  // Send email notification to internal team
  config.email.internal.to.forEach((email) => {
    client.sendEmail({
      'From': config.email.fromAddress,
      'To': email,
      'Subject': internalSubject(data),
      'HtmlBody': emailContentInternal(data),
      'Attachments': [attachment]
    })
  })
}

function createDocument(filename, body, callback) {
  const htmlToPDF = new HTMLToPDF({
    inputBody: body,
    outputPath: `./public${filename}`,
  })

  htmlToPDF.build((error) => {
    if(error) throw error

    callback()
  })
}
