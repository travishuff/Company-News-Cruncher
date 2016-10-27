$(document).ready((e) => {

  $( '#message-button' ).on('click', () => {
    let company = $( '#company' ).val();

    $.ajax({
      method: "POST",
      url: "/getNews",
      data: company,
      })
      .done(msg => {
        $( '.root' ).empty();
        console.log(msg);
        $( ".root" ).append( `<p>${msg}</p>` );
      });
    });

    $( '#ticker-button' ).on('click', () => {
    let ticker = $( '#ticker' ).val();

    $.ajax({
      method: "POST",
      url: "/getTicker",
      data: ticker,
      })
      .done(msg => {
        $( '.root2' ).empty();
        let parsed = msg.slice(3);
        parsed = JSON.parse(parsed);
        // console.log(parsed);
        $( ".root2" ).append( `<p>${parsed[0].t} ${parsed[0].l}</p>
                                <p class="ticker-time">${parsed[0].elt}</p>` );
      });
    });
});
