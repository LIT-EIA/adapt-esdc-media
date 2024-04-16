define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel'
], function (Adapt, ComponentView, ComponentModel) {

  var MediaView = ComponentView.extend({

    events: {
      "click .media-inline-transcript-button": "onToggleInlineTranscript",
      "click .media-external-transcript-button": "onExternalTranscriptClicked",
      "click .js-skip-to-transcript": "onSkipToTranscript"
    },

    className: function () {
      var classes = ComponentView.prototype.className.call(this);
      var playerOptions = this.model.get('_playerOptions');
      if (playerOptions && playerOptions.toggleCaptionsButtonWhenOnlyOne) {
        classes += " toggle-captions";
      }
      return classes;
    },

    preRender: function () {
      this.listenTo(Adapt, {
        'device:resize': this.onScreenSizeChanged,
        'device:changed': this.onDeviceChanged
      });

      // set initial player state attributes
      this.model.set({
        '_isMediaEnded': false,
        '_isMediaPlaying': false
      });

      var mediaObj = this.model.get('_media');
      var mediaCCArray = mediaObj['cc'] || [];

      mediaCCArray.forEach(function (item, index) {
        if (item['srclang'] === 'fr') {
          mediaCCArray[index]['trackLabel'] = 'Français';
        }
        else if (item['srclang'] === 'en') {
          mediaCCArray[index]['trackLabel'] = 'English';
        }
      });

      mediaObj['cc'] = mediaCCArray;
      this.model.set('_media', mediaObj);

      if (this.model.get('_media').source) {
        var media = this.model.get('_media');

        // Avoid loading of Mixed Content (insecure content on a secure page)
        if (window.location.protocol === 'https:' && media.source.indexOf('http:') === 0) {
          media.source = media.source.replace(/^http\:/, 'https:');
        }

        this.model.set('_media', media);
      }

      this.checkIfResetOnRevisit();
    },

    postRender: function () {
      this.setReadyStatus();
      this.setupEventListeners();
    },

    setupEventListeners: function () {
      const self = this;

      this.completionEvent = this.model.get('_setCompletionOn') || 'inview';

      const media = this.model.get('_media');
      const mediaType = (media.mp3 || media.ogg) ? 'audio' : 'video';

      const $audio = this.$el.find('audio');
      const $video = this.$el.find('video');

      const handleCompletion = function (event) {
        self.setCompletionStatus();
      };

      switch (this.completionEvent) {
        case 'inview':
          this.setupInviewCompletion('.component-widget');
          break;
        case 'play':
          if (mediaType === 'audio') {
            $audio.one('playing', handleCompletion);
          } else {
            $video.one('play', handleCompletion);
          }
          break;
        case 'ended':
          if (mediaType === 'audio') {
            $audio.one('ended', handleCompletion);
          } else {
            $video.one('ended', handleCompletion);
          }
          break;
        default:
          break;
      }
    },

    checkIfResetOnRevisit: function () {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    },

    onDeviceChanged: function () {
      if (this.model.get('_media').source) {
        this.$('.mejs-container').width(this.$('.component-widget').width());
      }
    },

    onScreenSizeChanged: function () {
      this.$('audio, video').width(this.$('.component-widget').width());
    },

    onSkipToTranscript: function () {
      // need slight delay before focussing button to make it work when JAWS is running
      // see https://github.com/adaptlearning/adapt_framework/issues/2427
      _.delay(function () {
        this.$('.media-transcript-container button').a11y_focus();
      }.bind(this), 250);
    },

    onToggleInlineTranscript: function (event) {
      if (event) event.preventDefault();
      var $transcriptBodyContainer = this.$(".media-inline-transcript-body-container");
      var $button = this.$(".media-inline-transcript-button");
      var $buttonText = this.$(".media-inline-transcript-button .transcript-text-container");

      if ($transcriptBodyContainer.hasClass("inline-transcript-open")) {
        $transcriptBodyContainer.stop(true, true).slideUp(function () {
          $(window).resize();
        });
        $button.attr('aria-expanded', false);
        $transcriptBodyContainer.removeClass("inline-transcript-open");
        $buttonText.html(this.model.get("_transcript").inlineTranscriptButton);
      } else {
        $transcriptBodyContainer.stop(true, true).slideDown(function () {
          $(window).resize();
        });
        $button.attr('aria-expanded', true);
        $transcriptBodyContainer.addClass("inline-transcript-open");
        $buttonText.html(this.model.get("_transcript").inlineTranscriptCloseButton);

        if (this.model.get('_transcript')._setCompletionOnView !== false) {
          this.setCompletionStatus();
        }
      }
    },

    onExternalTranscriptClicked: function (event) {
      if (this.model.get('_transcript')._setCompletionOnView !== false) {
        this.setCompletionStatus();
      }
    }

  });

  return Adapt.register('media', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: MediaView
  });

});
