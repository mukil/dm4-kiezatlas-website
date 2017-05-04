
DeepaMehta 4 Kiezatlas - Website
================================

This DeepaMehta 4 Plugin is the software module for ship- and development of the rewritten website to be hosted at www.kiezatlas.de. 

It builds on [DeepaMehta 4](https://github.com/jri/deepamehta) (Apache Lucene, Neo4J, Jetty among others) and our work of last year, especially on the 

 * [kiezatlas1](http://github.com/mukil/kiezatlas1)
 * [dm4-kiezatlas](http://github.com/mukil/dm4-kiezatlas) module
 * [dm4-kiezatlas-etl](http://github.com/mukil/dm4-kiezatlas-etl) module
 * [dm4-kiezatlas-angebote](http://github.com/mukil/dm4-kiezatlas-angebote) module
 * [dm4-kiezatlas-comments](http://github.com/mukil/dm4-kiezatlas-comments) module
 * [dm4-geospatial](http://github.com/mukil/dm4-geospatial) module
 * [dm4-images](http://github.com/mukil/dm4-images) module
 * [dm4-webpages](http://github.com/mukil/dm4-webpages) module
 * [dm4-sign-up](http://github.com/mukil/dm4-sign-up) module
 * [dm4-thymeleaf](http://github.com/jri/dm4-thymeleaf) module

but also on other open source software, such as

 * [jQuery](http://www.jquery.com)
 * [jQueryUI](http://www.jqueryui.com)
 * [SemanticUI CSS](http://www.semantic-ui.com)
 * [LeafletJS](http://www.leafletjs.com)

and on the Tile Map Service of [www.mapbox.com](http://www.mapbox.com).

### Usage & Development

If you want to adapt this software make sure to have your development environment set up like described in the DeepaMehta [Plugin Development Guide](https://trac.deepamehta.de/wiki/PluginDevelopmentGuide).

To install and setup hot-deployment for this plugin when having just downloaded and unzipped deepamehta, you could, for example configure your deepamehta bundle directory in the `pom.xml` of this plugin. Therefore add a `dm4.deploy.dir` path as a property to the `pom.xml` in this directory. For example:

```
    <properties>
        <dm4.deploy.dir>/home/oscar/deepamehta-4.8.3/bundle-deploy</dm4.deploy.dir>
    </properties>
```

To build dm4-kiezatlas-website successfully you'll need to build or install its dependencies into your local maven repository. This is due to the fact that we did not have the time to publish these bundles on maven central.

To do so, check out the following plugins source code from github and run `mvn clean install` in all of them: [dm4-kiezatlas](http://github.com/mukil/dm4-kiezatlas), [dm4-kiezatlas-etl](http://github.com/mukil/dm4-kiezatlas-etl), [dm4-geospatial](http://github.com/mukil/dm4-geospatial), [dm4-thymeleaf](http://github.com/jri/dm4-thymeleaf), [dm4-images](http://github.com/mukil/dm4-images), [dm4-kiezatlas-angebote](http://github.com/mukil/dm4-kiezatlas-angebote), [dm4-webpages](http://github.com/mukil/dm4-webpages) and [dm4-sign-up](http://github.com/mukil/dm4-sign-up).

Now you can build and hot-deploy the sources of the dm4-kiezatlas-website plugin using the following two commands:
```
grunt
mvn clean package
```

Grunt here is used to concat and minify some of the javascript sources as well as our custom selection of semantic-ui css components. Maven compiles the java sources and builds the plugin as an OSGi bundle.

License
-------

Thise source code is licensed under the GNU GPL 3.0. It comes with no warranty.

Version History
---------------

**0.6** -- 04 May, 2017

* Installs migration11
* Introduced csv bezirksregion / lor mapping (csv-import)

**0.5** -- Winter, 2016

* More robust geo object entry form
* Interface to serve simple, custom made Citymaps
* City and district wide fulltext search on geo objects
* Confirmation workflow for new geo objects created by the public
* ...

Author:<br/>
Malte Reißig, Copyright 2015-2016

