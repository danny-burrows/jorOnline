jQuery(function ($) {
  var $inputs = $('input[name=message],input[name=file]');
  $inputs.on('input', function () {
      // Set the required property of the other input to false if this input is not empty.
      $inputs.not(this).prop('required', !$(this).val().length);
  });
});


jQuery(function ($) {
  var $inputs = $('input[name=file]');
  $inputs.on('change', function (e) {

    var label = input.nextElementSibling,
                    labelVal = label.innerHTML;

    var fileName = 'choose a file';

    if ( this.files && this.files.length > 1 ) {
      fileName = ( this.getAttribute( 'data-multiple-caption' ) || '' ).replace( '{count}', this.files.length );
    } else {
      fileName = e.target.value.split( '\\' ).pop();
    }

    if ( fileName ) {
      label.querySelector('span').innerHTML = fileName;
    } else {
      label.innerHTML = labelVal;
    }
  });
});
