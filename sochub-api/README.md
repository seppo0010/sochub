# sochub-api

## Architecture

The API represents a post. The post contains
one text, zero or more media elements and zero or more additional keys.

### Text

The text is the body of the post. It is also the organizer for the media. It can
be markdown (for medium) and plain text (for twitter).

The output for each site is created from the text based on the rules for the
site. For example, markdown images are added to tweets as uploads, and
horizontal rules are used as Tweet threads indicators.

#### sochub metalanguage

To be able to set different text for each social networks we have extended the
markdown language to include conditionals. This are used as blockquote with
parameters and executed recursively if they match. For example

    All social networks.
    ```{output in ['instagram', 'twitter']}
    Only Instagram and Twitter.
    ```{output == 'instagram'}
    Only Instagram
    ```
    ```

### Media

Media elements can be stored in the API. A URL is created for each one.

### Additional keys

Arbitrary keys can be added for additional data. For example, post tags for
Medium or Instagram.

## Storage

The Sochub API is abstract and stateless. It must be extended to provide
concrete functionallity.
