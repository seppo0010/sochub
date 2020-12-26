TrelloPowerUp.initialize({
    'card-buttons': function(t, options) {
         return [
             {
                 /* icon: 'https://...', */
                 /* text: 'Action...', */
                 callback: function(t) {
                     return t.popup({
                         /* title: 'Title' */,
                         /* url: '/url' */,
                     });
                 }
             }
         ];
    },
});
