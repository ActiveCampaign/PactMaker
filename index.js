const express = require('express')
const app = express()
const path = require('path')
const fs = require('fs')
const HTMLToPDF = require('html5-to-pdf')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const config = require('./config')
const agreement = fs.readFileSync(`${__dirname}/views/agreement.ejs`, 'utf8')

const postmark = require('postmark')
const client = new postmark.Client(config.email.postmarkServerToken)

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

// Routes
app.get('/', (req, res) => {
  res.render('index')
})

app.post('/sign', (req, res) => {
  var template = ejs.compile(agreement)
  req.body.filename = `/agreements/${req.body.company}_${Date.now()}.pdf`;
  req.body.date = Date.now()

  convert(req.body.filename, template(req.body), () => {
    res.render('success', req.body)
    sendEmails(req.body)
  })
})

// Start server
app.listen(3000, () => console.log('Example app listening on port 3000!'))


function sendEmails(data) {
  const attachment = {
    'Content': fs.readFileSync(`./public${data.filename}`).toString('base64'),
    'Name': `${data.company}_${data.date}.pdf`,
    'ContentType': 'application/pdf'
  }

  // Send email to customer
  client.sendEmail({
    'From': config.email.fromAddress,
    'To': data.email,
    'Subject': config.email.signee.subject,
    'TextBody': 'Attached is your signed agreement',
    'Attachments': [attachment]
  })

  // Send email notification to internal team
  config.email.internal.to.forEach((email) => {
    client.sendEmail({
      'From': config.email.fromAddress,
      'To': email,
      'Subject': config.email.internal.subject,
      'TextBody': 'Attached is your signed agreement',
      'Attachments': [attachment]
    })
  })

}

function convert(filename, body, callback) {
  const htmlToPDF = new HTMLToPDF({
    inputBody: body,
    outputPath: `./public${filename}`,
  })

  htmlToPDF.build((error) => {
    if(error) throw error

    callback()
  })
}
