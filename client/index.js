$(document).ready((e) => {
  $('#message-button').on('click', () => {
    $.ajax({
      method: "POST",
      url: "/getNews",
      // data: { name: "John", location: "Boston" }
      })
      .done(function (msg) {
        $( "#root" ).append( `<p>${msg}</p>` );
      });
    });
});




