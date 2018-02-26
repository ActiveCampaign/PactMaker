var submit = document.querySelector('.js-submit');

// Create Signature Canvas
var signatureCanvas = document.querySelector('.js-sig-canvas');
var signaturePad = new SignaturePad(signatureCanvas, {
  minWidth: 1,
  maxWidth: 1,
  onBegin: function() {
    sigReset.classList.remove('hidden');
    submit.disabled = false;
  },
  onEnd: function() {
    document.querySelector('.js-sig').value = signaturePad.toDataURL();
  }
});

// Reset Signature button
var sigReset = document.querySelector('.js-sig-reset');
sigReset.addEventListener('click', function(event) {
  event.preventDefault();
  signaturePad.clear();
  this.classList.add('hidden');
  submit.disabled = true;
})
