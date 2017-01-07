$(document).ready((e) => {
  let today = Date();
  $('#date').append(today);
  
  $('#message-button').on('click', getAI);
  $('#company').on('keypress', (e) => {
    if (e.keyCode === 13) getAI();
  });

  function getAI() {
    let company = $('#company').val();
    $('#company').val('');

    $.ajax({
      method: "POST",
      url: "/getNews",
      data: company,
    })
    .done(msg => {
      $('.root').empty();
      console.log(msg);
      // write if staments to check for existence of concepts
      $(".root").append(`<p>Title: ${msg.title}</p>
                            <p>Sentiment: ${msg.docSentiment.type}</p>
                            <p>score: ${msg.docSentiment.score}</p>
                            <p>concept 1: ${msg.concepts[0].text}</p>
                            <p>relevance: ${msg.concepts[0].relevance}</p>`);
    });
  }

  $('#ticker-button').on('click', getTicker);
  $('#ticker').on('keypress', (e) => {
    if (e.keyCode === 13) getTicker();
  });

  function getTicker() {
    let ticker = $('#ticker').val();
    $('#ticker').val('');

    $.ajax({
      method: "POST",
      url: "/getTicker",
      data: ticker,
    })
    .done(msg => {
      $('.root2').empty();
      let parsed = msg.slice(3);
      parsed = JSON.parse(parsed);
      console.log(parsed);
      $(".root2").append(`<p>${parsed[0].t} ${parsed[0].l}</p>
                              <p class="ticker-time">${parsed[0].lt}</p>`);
    });
  }

});
