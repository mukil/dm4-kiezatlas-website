package de.kiezatlas.website;

import de.kiezatlas.website.util.NewsFeedItem;
import com.sun.jersey.api.view.Viewable;
import de.deepamehta.core.Association;
import de.deepamehta.core.ChildTopics;
import de.deepamehta.core.DeepaMehtaObject;
import java.util.*;
import java.util.logging.Logger;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.Consumes;
import javax.ws.rs.core.MediaType;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.model.ChildTopicsModel;
import de.deepamehta.core.model.SimpleValue;
import de.deepamehta.core.model.TopicModel;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Transactional;
import de.deepamehta.accesscontrol.AccessControlService;
import de.deepamehta.core.model.facets.FacetValueModel;
import de.deepamehta.core.service.accesscontrol.Operation;
import de.deepamehta.core.service.event.PostUpdateTopicListener;
import de.deepamehta.core.storage.spi.DeepaMehtaTransaction;
import de.deepamehta.core.util.DeepaMehtaUtils;
import de.deepamehta.core.util.JavaUtils;
import de.deepamehta.facets.FacetsService;
import de.deepamehta.files.FilesService;
import de.deepamehta.geomaps.model.GeoCoordinate;
import de.deepamehta.geomaps.GeomapsService;
import de.deepamehta.plugins.geospatial.GeospatialService;
import de.deepamehta.thymeleaf.ThymeleafPlugin;
import de.deepamehta.time.TimeService;
import de.deepamehta.workspaces.WorkspacesService;
import de.kiezatlas.KiezatlasPlugin;
import de.kiezatlas.KiezatlasService;
import static de.kiezatlas.KiezatlasService.GEO_OBJECT;
import static de.kiezatlas.KiezatlasService.GEO_OBJECT_ADDRESS;
import static de.kiezatlas.KiezatlasService.GEO_OBJECT_NAME;
import static de.kiezatlas.KiezatlasService.IMAGE_FACET;
import static de.kiezatlas.KiezatlasService.IMAGE_PATH;
import de.kiezatlas.angebote.AngebotService;
import static de.kiezatlas.angebote.AngebotService.ANGEBOT_BESCHREIBUNG;
import de.kiezatlas.angebote.events.AngeboteResourceRequestedListener;
import de.kiezatlas.angebote.model.AngebotsinfosAssigned;
import static de.kiezatlas.etl.KiezatlasETLService.BESCHREIBUNG;
import static de.kiezatlas.etl.KiezatlasETLService.BESCHREIBUNG_FACET;
import static de.kiezatlas.etl.KiezatlasETLService.OEFFNUNGSZEITEN;
import static de.kiezatlas.etl.KiezatlasETLService.OEFFNUNGSZEITEN_FACET;
import de.kiezatlas.website.model.BezirkView;
import de.kiezatlas.website.model.EinrichtungView;
import de.kiezatlas.website.model.GeoDetailView;
import de.kiezatlas.website.model.GeoMapView;
import de.kiezatlas.website.model.CitymapView;
import de.kiezatlas.website.model.CoordinatesView;
import de.kiezatlas.website.util.NewsFeedClient;
import de.mikromedia.webpages.model.Webpage;
import de.mikromedia.webpages.WebpageService;
import de.mikromedia.webpages.model.Website;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.RoundingMode;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLEncoder;
import java.text.DateFormat;
import java.text.DecimalFormat;
import java.util.logging.Level;
import java.util.HashMap;
import java.util.concurrent.Callable;
import javax.ws.rs.FormParam;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;
import org.deepamehta.plugins.signup.SignupPlugin;
import org.deepamehta.plugins.signup.service.SignupPluginService;
import org.deepamehta.plugins.signup.events.SignupResourceRequestedListener;
import de.kiezatlas.angebote.events.AssignedAngebotListener;
import de.kiezatlas.angebote.events.ContactAnbieterListener;
import de.kiezatlas.angebote.events.RemovedAngebotListener;
import de.kiezatlas.comments.CommentsService;
import de.kiezatlas.etl.KiezatlasETLService;
import static de.kiezatlas.etl.KiezatlasETLService.ANGEBOT_CRIT;
import static de.kiezatlas.etl.KiezatlasETLService.ANGEBOT_FACET;
import static de.kiezatlas.etl.KiezatlasETLService.BEZIRK;
import static de.kiezatlas.etl.KiezatlasETLService.BEZIRK_FACET;
import static de.kiezatlas.etl.KiezatlasETLService.KONTAKT;
import static de.kiezatlas.etl.KiezatlasETLService.KONTAKT_ANSPRECHPARTNER;
import static de.kiezatlas.etl.KiezatlasETLService.KONTAKT_FACET;
import static de.kiezatlas.etl.KiezatlasETLService.KONTAKT_FAX;
import static de.kiezatlas.etl.KiezatlasETLService.KONTAKT_MAIL;
import static de.kiezatlas.etl.KiezatlasETLService.KONTAKT_TEL;
import static de.kiezatlas.etl.KiezatlasETLService.LOR_FACET;
import static de.kiezatlas.etl.KiezatlasETLService.STICHWORTE_FACET;
import static de.kiezatlas.etl.KiezatlasETLService.THEMA_CRIT;
import static de.kiezatlas.etl.KiezatlasETLService.THEMA_FACET;
import static de.kiezatlas.etl.KiezatlasETLService.ZIELGRUPPE_CRIT;
import static de.kiezatlas.etl.KiezatlasETLService.ZIELGRUPPE_FACET;
import de.kiezatlas.website.model.BezirksregionView;
import de.kiezatlas.website.model.CommentView;
import de.kiezatlas.website.model.SearchKeywords;
import de.kiezatlas.website.model.SearchResultList;
import de.kiezatlas.website.model.SearchResult;
import de.kiezatlas.website.model.UsernameView;
import de.mikromedia.webpages.events.CustomRootResourceRequestedListener;
import de.mikromedia.webpages.events.ResourceNotFoundListener;
import de.mikromedia.webpages.events.WebpageRequestedListener;
import de.mikromedia.webpages.model.MenuItem;
import java.net.URI;
import java.net.URISyntaxException;
import javax.ws.rs.DELETE;
import org.thymeleaf.context.AbstractContext;

/**
 * The module orchestrates all bundles composing the Kiezatlas 2 Website.<br/>
 * 
 * <a href="http://github.com/mukil/dm4-kiezatlas-website">Source Code</a>
 *
 * @author Malte Reißig (<a href="mailto:malte@mikromedia.de">Contact</a>)
 * @version 0.7-SNAPSHOT
 */
@Path("/website")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class WebsitePlugin extends ThymeleafPlugin implements WebsiteService, AssignedAngebotListener,
                                                                              RemovedAngebotListener,
                                                                              ContactAnbieterListener,
                                                                              PostUpdateTopicListener,
                                                                              SignupResourceRequestedListener,
                                                                              AngeboteResourceRequestedListener,
                                                                              WebpageRequestedListener,
                                                                              CustomRootResourceRequestedListener,
                                                                              ResourceNotFoundListener {

    private final Logger log = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaces;
    @Inject private AccessControlService accesscl;
    @Inject private GeospatialService geospatial;
    @Inject private GeomapsService geomaps;
    @Inject private FacetsService facets;
    @Inject private FilesService files;
    @Inject private KiezatlasService kiezatlas;
    @Inject private WebpageService webpages;
    @Inject private AngebotService angebote;
    @Inject private CommentsService comments;
    @Inject private SignupPluginService signup;
    @Inject private TimeService time;
    @Inject private KiezatlasETLService etl;

    // Application Cache of District Overview Resultsets
    HashMap<Long, List<GeoMapView>> citymapCache = new HashMap<Long, List<GeoMapView>>();
    HashMap<Long, Long> citymapCachedAt = new HashMap<Long, Long>();
    HashMap<String, Topic> internalLORs = new HashMap<String, Topic>();
    List<Topic> availableDistricts = null;

    public static final String DM4_HOST_URL = System.getProperty("dm4.host.url"); // should come with trailing slash
    public static final String ANGEBOTE_RESOURCE = "angebote/";
    public static final String GEO_OBJECT_RESOURCE = "website/geo/";
    public static final String MY_ENTRIES_RESOURCE = "angebote/my";
    public static final String GOOGLE_API_KEY = "";

    // DM4 URIs
    static final String DEFAULT_ROLE = "dm4.core.default";
    static final String PARENT_ROLE = "dm4.core.parent";
    static final String CHILD_ROLE = "dm4.core.child";
    static final String ASSOCIATION = "dm4.core.association";

    public static DateFormat df = DateFormat.getDateInstance(DateFormat.LONG, Locale.GERMANY);
    public static final String SYSTEM_MAINTENANCE_MAILBOX = "support@kiezatlas.de";

    // HashMap<String, JSONObject> recoveryToken = new HashMap<String, JSONObject>();

    // Geo Object Form Input Validation Utilities
    public static final long NEW_TOPIC_ID = -1;
    // private static final String INVALID_ZIPCODE_INPUT = "Bitte geben Sie eine f&uuml;nfstellige Postleitzahl f&uuml;r diese Einrichtung an.";
    public static final String INVALID_DISTRICT_SELECTION = "Bitte w&auml;hlen Sie den Stadtbezirk f&uuml;r diese Einrichtung aus.";

    @Override
    public void init() {
        initTemplateEngine(); // initting a thymeleaf template engine for this bundle specifically too
        populateInternalLORIDMapCache();
    }

    @Override
    public void serviceArrived(Object service) {
        if (service instanceof WebpageService) {
            log.info("Announcing our Website Bundle as additional template resource at Webpages TemplateEngines");
            webpages.addTemplateResolverBundle(bundle);
            // Overrides root resource response of the dm4-webpages plugin
            webpages.overrideFrontpageTemplate("website-grid");
            // Register additional root resource names we want to respond to
            initializeCityMapWebAliasResources();
        } else if (service instanceof SignupPluginService) {
            log.info("Announcing our Website Bundle as additional template resource at Signup TemplateEngines");
            signup.addTemplateResolverBundle(bundle);
            signup.reinitTemplateEngine();
        }
    }

    @Override
    public void serviceGone(Object service) {
        log.info("Unregistering our Website Bundle as additional template resource from other TemplateEngines");
        if (service instanceof WebpageService) {
            webpages.removeTemplateResolverBundle(bundle);
            webpages.reinitTemplateEngine();
        } else if (service instanceof SignupPluginService) {
            signup.removeTemplateResolverBundle(bundle);
            signup.reinitTemplateEngine();
        }
    }



    // --------------------------------------------------------------------------------- Routing Pages and Forms ------/



    /** Responds with a Viewable, the new frontpage of the Kiezatlas Website. */
    @GET
    @Path("/")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareNewFrontpage(@QueryParam("context") long site, @QueryParam("search") String search,
            @QueryParam("koordinate") String koordinate, @QueryParam("zoomstufe") String zoomstufe,
            @QueryParam("type") String searchType, @QueryParam("method") String searchMethod,
            @QueryParam("nearby") String searchNearby) {
        prepareSearchTemplateParameter(search, site, searchMethod, searchType, searchNearby);
        viewData("koordinate", koordinate);
        viewData("zoomstufe", zoomstufe);
        log.info("Frontpage search preparation, search=" + search + " type=" + searchType + " contextId=" + site);
        preparePageTemplate("website-grid");
        return getFrontpage();
    }

    @GET
    @Path("/startseite")
    public Response redirectNewFrontpage() {
        return Response.seeOther(URI.create("/")).build();
    }

    /** Responds with a Viewable, the new frontpage of the Kiezatlas Website. */
    @GET
    @Path("/map")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareCityMap(@QueryParam("context") long site, @QueryParam("search") String search,
            @QueryParam("koordinate") String koordinate, @QueryParam("zoomstufe") String zoomstufe,
            @QueryParam("type") String searchType, @QueryParam("method") String searchMethod,
            @QueryParam("nearby") String searchNearby) {
        prepareSearchTemplateParameter(search, site, searchMethod, searchType, searchNearby);
        viewData("searchMethod", "fulltext");
        return getWebsiteMap();
    }

    /** Responds with a Viewable, the new frontpage of the Kiezatlas Website. */
    @GET
    @Path("/sozialraumdaten")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareSozialraumdaten(@QueryParam("lorId") String lorId, @QueryParam("context") long site, @QueryParam("search") String search,
            @QueryParam("koordinate") String koordinate, @QueryParam("zoomstufe") String zoomstufe,
            @QueryParam("type") String searchType, @QueryParam("method") String searchMethod,
            @QueryParam("nearby") String searchNearby) {
        viewData("lorId", lorId);
        viewData("koordinate", koordinate);
        viewData("zoomstufe", zoomstufe);
        log.info("LOR Page preparation ("+lorId+"), search=" + search + " type=" + searchType + " contextId=" + site);
        preparePageTemplate("website-lor");
        return view("website-lor");
    }

    @GET
    @Path("/sites")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareSitespage() {
        if (!isAuthenticated() || !isSiteEditor()) return getUnauthorizedPage();
        viewData("page", "site-listing");
        viewData("sites", getSites());
        preparePageTemplate("sites");
        return view("sites");
    }

    @GET
    @Path("/edit/{siteId}")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareSitesEditorPage(@PathParam("siteId") long topicId) {
        if (!isAuthenticated() || !isSiteEditor()) return getUnauthorizedPage();
        viewData("site", dm4.getTopic(topicId));
        viewData("page", "site-editor");
        List<RelatedTopic> websites = kiezatlas.getGeoObjectsBySite(topicId);
        sortBySimpleValueDescending(websites);
        viewData("geoobjects", websites);
        preparePageTemplate("sites");
        return view("sites");
    }

    @GET
    @Path("/edit/{siteId}/facets/{objectId}")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareSitesFacetEditorPage(@PathParam("siteId") long siteId, @PathParam("objectId") long objectId) {
        if (!isAuthenticated() || !isSiteEditor()) return getUnauthorizedPage();
        Topic object = dm4.getTopic(objectId);
        if (isGeoObjectTopic(object)) {
            viewData("site", dm4.getTopic(siteId));
            viewData("geoobject", kiezatlas.enrichWithFacets(object, siteId));
            viewData("facets", kiezatlas.getFacetTypes(siteId));
            preparePageTemplate("facet-editor");
            return view("facet-editor");
        } else {
            preparePageTemplate("facet-editor");
            return getNotFoundPage("Der angeforderte Datensatz ist kein Geoobjekt, so funktioniert das nicht.");
        }
    }

    @PUT
    @Path("/edit/{siteId}/facets/{objectId}")
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Topic updateWebsiteFacets(@PathParam("siteId") long siteId, @PathParam("objectId") long objectId, TopicModel tm) {
        if (!isSiteEditor()) throw new WebApplicationException(Status.UNAUTHORIZED);
        Topic object = dm4.getTopic(objectId);
        if (isGeoObjectTopic(object)) {
            log.info("Updating facets for geo object in site with TopicModel=" + tm.toJSON().toString());
            kiezatlas.updateFacets(objectId, kiezatlas.getFacetTypes(siteId), tm);
        } else {
            log.warning("Can not update facets of a non geo-object for siteId=" + siteId + ", tm=" + tm.toJSON());
        }
        return object;
    }

    /**
     * Processes the form for creating a Kiezatlas Einrichtung in a specific Workspace.
     * Note: Saving Address needs "dm4_no_geocoding=true" Cookie, otherwise it geo-codes automatically.
     */
    @POST
    @Produces(MediaType.TEXT_HTML)
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Path("/geo/save")
    @Transactional
    public Viewable processGeoObjectFormPage(@FormParam("id") long topicId, @FormParam("name") String name, @FormParam("strasse") String strasse,
            @FormParam("plz") String plz, @FormParam("city") long city, @FormParam("district") long district, @FormParam("fileTopicId") long bildTopicId,
            @FormParam("country") long country, @FormParam("beschreibung") String beschreibung,
            @FormParam("open") String oeffnungszeiten, @FormParam("ansprechpartner") String ansprechpartner,
            @FormParam("telefon") String telefon, @FormParam("email") String email, @FormParam("fax") String fax,
            @FormParam("website") String website, @FormParam("lat") double latitude, @FormParam("lon") double longitude,
            @FormParam("themen") List<Long> themen, @FormParam("angebote") List<Long> angebote, @FormParam("zielgruppen") List<Long> zielgruppen) {
        if (!isAuthenticated()) return getUnauthorizedPage();
        Topic geoObject = null;
        Topic username = getUsernameTopic();
        String coordinatePair = "", geoLocation = "";
        if (district == NEW_TOPIC_ID) {
            // Client side input validation is available so this rarely happen
            // ### Server side validation will let user loose all user input...
            log.warning("Saving new geo object prohibited - NO DISTRICT Given");
            viewData("warning", INVALID_DISTRICT_SELECTION);
            return (topicId == NEW_TOPIC_ID) ? WebsitePlugin.this.prepareGeoObjectFormPage() : prepareGeoObjectFormPage(topicId);
        }
        // Handle Geo Coordinates of Geo Object
        if (latitude == -1000 || longitude == -1000) {
            geoLocation = geoCodeAddressInput(URLEncoder.encode(strasse + ", " + plz + " " + city));
            coordinatePair = parseFirstCoordinatePair(geoLocation);
            log.info("Auto-set geo coordinates by Street, Postal Code, City Value to \"" + coordinatePair + "\"");
        } else {
            log.info("Geo Coordinates provided: " + latitude + ", " + longitude);
            coordinatePair = longitude + "," + latitude;
        }
        ChildTopicsModel addressValue = mf.newChildTopicsModel();
        addStreetTopicValue(addressValue, strasse);
        addPostalCodeValue(addressValue, plz);
        addCityTopicValue(addressValue, city);
        addCountryTopicValue(addressValue, country);
        // Assemble and create/update new Geo Object Topic basics
        ChildTopicsModel geoObjectTopicModel = mf.newChildTopicsModel()
            .put("ka2.geo_object.name", name)
            .put("dm4.contacts.address", addressValue);
        if (topicId == NEW_TOPIC_ID) {
            try {
                log.info("// ---------- CREATing Einrichtung " + name + " ---------------------- // ");
                // ------------ Assign Geo Object Basics to the topic of getPrivilegedWorkspace() ------------------ //
                geoObject = createGeoObjectWithoutWorkspace(mf.newTopicModel("ka2.geo_object", geoObjectTopicModel),
                    geoObject, ansprechpartner, telefon, fax, email, beschreibung, oeffnungszeiten, website,
                    coordinatePair, district, themen, zielgruppen, angebote);
                Association assignment = createUserAssignment(geoObject);
                privilegedAssignToWorkspace(assignment, getConfirmationWorkspace().getId());
                // Handles Image-File Upload (Seperately)
                processBildAssignment(geoObject, username, bildTopicId);
                initiallyAssignGeoObjectFacetsToWorkspace(geoObject, getConfirmationWorkspace());
                // Assign Geo Object to Confirmation WS (at last, otherwise we could not write its facets)
                initiallyAssignGeoObjecToWorkspace(geoObject, getConfirmationWorkspace());
                // Note: If notification fails, confirmation mail fails too (Check again, also that effect on creation)
                sendGeoObjectCreationNotice("Neuer Einrichtungsdatensatz im Kiezatlas", geoObject, username);
                viewData("message", "Vielen Dank, Sie haben erfolgreich einen neuen Ort in den Kiezatlas eingetragen. "
                    + "Die Bezirk-Administrator_innen wurden benachrichtigt und wir werden Ihren Eintrag so schnell wie m&ouml;glich freischalten.");
                log.info("// ---------- Es wurde erfolgreiche eine neue Einrichtung im Kiezatlas ANGELEGT (" + name + ")");
            } catch (Exception ex) {
                // If a geoObject was already created assign it to a workspace (otherwise we can not easily delete it).
                // if (geoObject != null) assignGeoObjecToWorkspace(geoObject, getPrivilegedWorkspace());
                throw new RuntimeException(ex);
            }
        } else {
            log.info("// ---------- UPDATing Einrichtung " + name + " (TopicID: " + topicId + ") -------------- // ");
            geoObject = dm4.getTopic(topicId);
            if (isGeoObjectEditable(geoObject, username)) {
                // the following should create new street, postal code, city and country topics (which is not what we want)
                geoObject.setChildTopics(geoObjectTopicModel);
                attachGeoObjectChildTopics(geoObject, ansprechpartner, telefon, fax, email, beschreibung,
                    oeffnungszeiten, website, coordinatePair, district, themen, zielgruppen, angebote);
                time.setModified(geoObject);
                processBildAssignment(geoObject, username, bildTopicId);
                viewData("message", "Danke, der <a href=\"/" + GEO_OBJECT_RESOURCE + geoObject.getId()
                    + "\" title=\"Anzeigen\">Datensatz</a> wurde aktualisiert.");
            } else {
                viewData("message", "Sie sind aktuell leider nicht berechtigt diesen Datensatz zu bearbeiten.");
                return getUnauthorizedPage();
            }
        }
        log.info("Saved Geo Object Input " + geoObject);
        viewData("name", geoObject.getSimpleValue().toString());
        viewData("coordinates", coordinatePair);
        return getSimpleMessagePage();
    }

    private void processBildAssignment(Topic geoObject, Topic username, long bildTopicId) {
        if (bildTopicId != 0 && bildTopicId != -1) {
            Topic existingBild = getBildFileAssignment(geoObject);
            if (existingBild != null) {
                log.info("Remove existing Bild File Topic relation: " + existingBild.getSimpleValue());
                existingBild.delete();
            }
            Topic bildTopic = dm4.getTopic(bildTopicId);
            if (bildTopic.getTypeUri().equals("dm4.files.file")) {
                log.info("Assigning Bild File Topic " + files.getFile(bildTopicId).getPath());
                createBildAssignment(geoObject, username, bildTopicId);
            } else {
                log.info("Processing Bild Pfad Assignment ("+bildTopic.getSimpleValue()+") - Doing Nothing");
            }
        } else {
            log.info("NO Bild File Topic ID submitted for \"" + geoObject.getSimpleValue().toString());
        }
    }

    /**
     * Builds up a form for introducing a NEW Kiezatlas Einrichtung (Geo Object).
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/geo/create/simple")
    public Viewable prepareGeoObjectFormPageSimple() {
        if (!isAuthenticated()) return getUnauthorizedPage();
        viewData("simple", true);
        return WebsitePlugin.this.prepareGeoObjectFormPage();
    }

    /**
     * Builds up a form for introducing a NEW Kiezatlas Einrichtung (Geo Object).
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/geo/create")
    public Viewable prepareGeoObjectFormPage() {
        if (!isAuthenticated()) return getUnauthorizedPage();
        EinrichtungView geoObject = new EinrichtungView();
        // Use Geo Coordinates of Brandenburger Tor as starting point
        geoObject.setCoordinates(new GeoCoordinate(13.377757, 52.516329));
        // geoObject.setName("");
        geoObject.setId(-1);
        viewData("geoobject", geoObject);
        viewData("themen", new ArrayList<RelatedTopic>());
        viewData("zielgruppen", new ArrayList<RelatedTopic>());
        viewData("angebote", new ArrayList<RelatedTopic>());
        populateGeoObjectFormTemplate();
        preparePageTemplate("website-edit");
        viewData("workspace", getConfirmationWorkspace());
        return view("website-edit");
    }

    /**
     * Builds up a formf for editing a Kiezatlas Einrichtung.
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/geo/edit/{topicId}")
    public Viewable prepareGeoObjectFormPage(@PathParam("topicId") long topicId) {
        Topic geoObject = dm4.getTopic(topicId);
        if (!isAuthenticated()) return getUnauthorizedPage();
        Topic username = getUsernameTopic();
        boolean isEditable = isGeoObjectEditable(geoObject, username);
        if (isGeoObjectTopic(geoObject)) {
            if (isEditable) {
                EinrichtungView einrichtung = assembleEinrichtungsDetails(geoObject);
                einrichtung.setAssignedUsername(username.getSimpleValue().toString());
                viewData("geoobject", einrichtung);
                viewData("themen", facets.getFacets(geoObject, THEMA_FACET));
                viewData("zielgruppen", facets.getFacets(geoObject, ZIELGRUPPE_FACET));
                viewData("angebote", facets.getFacets(geoObject, ANGEBOT_FACET));
            } else {
                viewData("message", "Sie haben aktuell nicht die nötigen Berechtigungen "
                    + "um diesen Datensatz in Kiezatlas 2 zu bearbeiten.");
                return prepareGeoObjectTemplate(geoObject.getId());
            }
        } else {
            return getNotFoundPage("Eine Einrichtung mit dieser ID ist uns nicht bekannt.");
        }
        populateGeoObjectFormTemplate();
        preparePageTemplate("website-edit");
        // this makes sure we keep all (potentially new) child topics in the same workspace its parent is while editing
        viewData("workspace", getAssignedWorkspace(geoObject));
        viewData("editable", isEditable);
        return view("website-edit");
    }

    /**
     * Renders details about a Kiezatlas Geo Object into HTML.
     *
     * @param topicId
     * @return
     */
    @GET
    @Path("/geo/{topicId}")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareGeoObjectInfoPage(@PathParam("topicId") String topicId, @QueryParam("context") long contextId,
            @QueryParam("search") String search, @QueryParam("type") String searchType,
            @QueryParam("method") String searchMethod, @QueryParam("nearby") String searchNearby) {
        Topic geoObject = getGeoObjectById(topicId);
        prepareSearchTemplateParameter(search, contextId, searchMethod, searchType, searchNearby);
        log.info("Requested Place ("+topicId+") Search preparation, search=" + search + " type=" + searchType + " context=" + contextId);
        return (geoObject != null) ? prepareGeoObjectTemplate(geoObject.getId()) : getNotFoundPage();
    }

    /**
     * Fetches details about a Kiezatlas Geo Object.
     * @param referrer
     * @param topicId
     * @return A GeoObject DetailsView as DTO to presend details about a place.
     */
    @GET
    @Path("/geo/{topicId}")
    @Produces(MediaType.APPLICATION_JSON)
    public GeoDetailView getGeoObjectDetails(@HeaderParam("Referer") String referrer,
            @PathParam("topicId") long topicId) {
        if (!isValidReferer(referrer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        log.info("Load geo object details via API: " + topicId);
        Topic geoObject = dm4.getTopic(topicId);
        GeoDetailView geoDetailsView = null;
        if (isGeoObjectTopic(geoObject)) {
            geoDetailsView = new GeoDetailView(geoObject, geomaps, angebote);
            Topic region = getRelatedBezirksregion(geoObject);
            if (region != null) {
                geoDetailsView.setBezirksregion(region.getSimpleValue().toString());
            }
            if (!geoDetailsView.hasLorNumber()) { // Use geospatial shapefile layer to supplement for non-existing lor-id facet
                GeoMapView geoView = geoDetailsView.getGeoViewModel();
                String lor = geospatial.getGeometryFeatureNameByCoordinate(geoView.getGeoCoordinateLatValue()
                    + ", " + geoView.getGeoCoordinateLngValue());
                if (lor != null) { // Strip "Flaeche .." (lor-berlin Shapefile specific)
                    geoDetailsView.setLorValue(cleanUpShapefileFeatureName(lor));
                }
            }
            if (isInReview(geoObject)) geoDetailsView.setUnconfirmed();
        }
        return geoDetailsView;
    }

    @GET
    @Path("/geo/delete/{topicId}")
    @Produces(MediaType.TEXT_HTML)
    @Transactional
    public Viewable processGeoObjectDeletion(@PathParam("topicId") String topicId, @QueryParam("context") long contextId,
            @QueryParam("search") String search, @QueryParam("type") String searchType,
            @QueryParam("method") String searchMethod, @QueryParam("nearby") String searchNearby) {
        // Check Authorization
        Topic geoObject = getGeoObjectById(topicId);
        String name = geoObject.getSimpleValue().toString();
        if (geoObject != null && isGeoObjectEditable(geoObject, accesscl.getUsernameTopic())) {
            log.info("DELETING Geo Object " + geoObject);
            if (deleteCompleteGeoObjectInWorkspace(geoObject)) {
                // viewData("message", "Danke, der Datensatz</a> wurde aktualisiert.");
                viewData("message", "Der Datensatz <a href=\"/" + GEO_OBJECT_RESOURCE + geoObject.getId()
                    + "\" title=\"Anzeigen\">"+geoObject.getSimpleValue()+"</a> wurde erfolgreich zur Löschung vorgeschlagen und "
                        + "ist somit vorerst nicht mehr öffentlich sichtbar.");
                log.info("Topic \"" + name + "\", id=" + topicId
                    + " moved into Papierkorb successfully by \"" + accesscl.getUsername() + "\"");
                log.info("TRASHED: " + dm4.getTopic(Long.parseLong(topicId)));
                return getSimpleMessagePage();
            } else {
                viewData("message", "Der Datensatz konnte nicht gelöscht werden da ein Fehler aufgetreten ist.");
                return prepareGeoObjectInfoPage("" + topicId, contextId, search, searchType, searchMethod, searchNearby);
            }
        } else {
            log.info("Geo Object could not be loaded by topicId=\"" + topicId + "\"");
        }
        viewData("message", "<p>Der Datensatz konnte nicht gelöscht werden, da Sie dazu nicht die nötigen Berechtigungen haben.</p>"
                + "<p><a href=\"/angebote/my\">Zur&uuml;ck zu meinen Eintr&auml;gen</a></p>");
        return prepareGeoObjectInfoPage("" + topicId, contextId, search, searchType, searchMethod, searchNearby);
    }

    @GET
    @Path("/geo/delete/final/{topicId}")
    @Produces(MediaType.TEXT_HTML)
    @Transactional
    public Viewable processFinalGeoObjectDeletion(@PathParam("topicId") String topicId, @QueryParam("context") long contextId,
            @QueryParam("search") String search, @QueryParam("type") String searchType,
            @QueryParam("method") String searchMethod, @QueryParam("nearby") String searchNearby) {
        if (!isAuthenticated()) return getUnauthorizedPage();
        Topic geoObject = getGeoObjectById(topicId);
        String name = geoObject.getSimpleValue().toString();
        if (geoObject != null && isGeoObjectEditable(geoObject, accesscl.getUsernameTopic()) && isTopicInDeletionWorkspace(geoObject)) {
            log.info("Final DELETION of Geo Object " + geoObject);
            geoObject.delete();
            viewData("message", "<p>Der Ort <b>"+name+"</b> wurde erfolgreich aus dem Kiezatlas entfernt.</p>"
                    + "<p><a href=\"/angebote/my\">Zur&uuml;ck zu meinen Eintr&auml;gen</a></p>");
            log.info("The geo object \"" + name + "\" is now GONE");
            return getSimpleMessagePage();
        }
        viewData("message", "Der Datensatz konnte nicht gelöscht werden, da Sie dazu nicht die nötigen Berechtigungen haben.");
        return prepareGeoObjectInfoPage("" + topicId, contextId, search, searchType, searchMethod, searchNearby);
    }

    private Viewable prepareBezirksregionListingPage(@PathParam("districtId") long districtId) {
        if (!isAuthenticated()) return getUnauthorizedPage();
        List<BezirksregionView> bezirksregionen = null;
        viewData("name", "Bezirksregionen");
        if (districtId != -1 && isUserAssociatedWithBezirk(districtId)) {
            viewData("districtId", districtId);
            bezirksregionen = getKiezatlasBezirksregionen(districtId);
            // ### Fetch first Bezirksregion in District
            if (bezirksregionen == null || bezirksregionen.isEmpty()) {
                viewData("message", "Es tut uns leid, wir konnten die Bezirksregionen für den Bezirk mit der ID=\""
                    + districtId + "\" nicht laden.");
                return getSimpleMessagePage();
            } else {
                viewData("confirmationMembers", getAngeboteMembers());
                return prepareBezirksregionenTemplate(bezirksregionen);
            }
        }
        viewData("message", "Ihr Account scheint noch nicht als Bezirk-Administrator_in eingerichtet zu sein. "
            + "Wenden Sie sich bitte an die Administrator_innen.");
        return getSimpleMessagePage();
    }

    /**
     * Responds with a Viewable, the administrative confirmation page of the Kiezatlas Website.
     * @return
     */
    @GET
    @Path("/list/freischalten/{districtId}")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareConfirmationListing(@PathParam("districtId") long districtId) {
        if (!isConfirmationWorkspaceMember()) return getUnauthorizedPage();
        // 1) Requesting User is related to District
        List<RelatedTopic> eligibleRegions = null;
        if (districtId > 0) {
            Topic district = dm4.getTopic(districtId);
            eligibleRegions = getUserDistrictTopics();
            for (RelatedTopic userDistrict : eligibleRegions) {
                if (userDistrict.getId() == districtId) {
                    List<EinrichtungView> results = getUnconfirmedEinrichtungenInBezirk(district);
                    viewData("districtId", districtId);
                    viewData("name", "Neueintragungen");
                    return getConfirmationBezirkTemplate(results);
                    // 1.1) Returns list of all geo objects in this district
                }
            }
        } else {
            // 2) Requesting a list of all geoobjects organized by bezirksregionen the user is manager of
            List<BezirksregionView> bezirksregionen = new ArrayList<BezirksregionView>();
            eligibleRegions = getUserSubregionTopics();
            if (eligibleRegions.size() > 0) {
                for (RelatedTopic region : eligibleRegions) {
                    List<RelatedTopic> geoObjects = getUnconfirmedGeoObjectsInBezirksregion(region);
                    BezirksregionView regionViewModel = new BezirksregionView(region);
                    regionViewModel.setBezirk(getBezirksUtilName(region));
                    regionViewModel.setAnsprechpartner(region.getRelatedTopics(USER_ASSIGNMENT));
                    sortAlphabeticalDescending(geoObjects);
                    regionViewModel.setGeoObjects(geoObjects);
                    bezirksregionen.add(regionViewModel);
                }
                viewData("name", "Neueintragungen");
                return getConfirmationBezirksregionTemplate(bezirksregionen);
                // 2.1) Returns list of all geo objects organized in bezirksregionen the editor is manager of
            }
        }
        // 3) Returns a message page with info on "not authorized"
        viewData("name", "Neueintragungen freischalten");
        viewData("message", "Ihr Account scheint f&uuml;r diesen Bezirk nicht als Bezirk-Administrator_in eingerichtet zu sein. "
            + "Wenden Sie sich bitte an die Administrator_innen.");
        return getSimpleMessagePage();
    }

    /**
     * Moves a \"Geo Object\" topic into our public default workspace.
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/geo/confirm/{topicId}")
    @Transactional
    public Viewable processGeoObjectConfirmation(@PathParam("topicId") long topicId) {
        if (!isAuthenticated()) return getUnauthorizedPage();
        if (!isConfirmationWorkspaceMember()) {
            viewData("message", "Sie haben aktuell keine Berechtigungen neue Datens&auml;tze zu ver&ouml;ffentlichen.");
            return getUnauthorizedPage();
        }
        Topic geoObject = dm4.getTopic(topicId);
        if (isGeoObjectTopic(geoObject)) {
            moveGeoObjecToWorkspace(geoObject, getStandardWorkspace(), false);
            moveGeoObjecFacetsToWorkspace(geoObject, getStandardWorkspace());
            viewData("message", "Der Eintrag \"" + geoObject.getSimpleValue() + "\" erfolgreich freigeschaltet.");
            List<String> mailboxes = getAssignedUserMailboxes(geoObject);
            sendConfirmationNotice(mailboxes, geoObject);
        } else {
            viewData("message", "Eine Einrichtung mit dieser ID ist uns nicht bekannt.");
            return getNotFoundPage();
        }
        return prepareGeoObjectTemplate(geoObject.getId());
    }

    // ------------------------------------------------------------ Bezirks and Bezirksregionen List Resources ----- //

    @GET
    @Path("/list")
    @Produces(MediaType.TEXT_HTML)
    public Response prepareEinrichtungsListing() throws URISyntaxException {
        if (!isAuthenticated()) return Response.status(Status.UNAUTHORIZED).build();
        List<RelatedTopic> usersDistricts = getUserDistrictTopics();
        long districtId = -1;
        String newListLocation = "/website/list/filter";
        if (usersDistricts != null && usersDistricts.size() > 0) {
            districtId = usersDistricts.get(0).getId();
            newListLocation += "/" + districtId;
        }
        return Response.seeOther(new URI(newListLocation)).build();
    }

    @GET
    @Path("/list/filter")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareGeoObjectFilterListing() {
        return prepareGeoObjectFilterListing(0);
    }

    @GET
    @Path("/list/filter/{region}")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareGeoObjectFilterListing(@PathParam("region") long region) {
        if (!isAuthenticated()) return getUnauthorizedPage();
        if (region == 0) {
            List<RelatedTopic> bezirke = getUserDistrictTopics();
            List<RelatedTopic> bezirksregionen = getUserSubregionTopics();
            if (bezirke != null && bezirke.size() > 0) {
                Topic bezirk = bezirke.get(0);
                log.info("Initializing filter LIST for districtId=\"" + bezirk.getId() + "\" and user \"" + accesscl.getUsername() + "\"");
                viewData("viewName", bezirk.getSimpleValue().toString());
                return preparePublicFilterList(bezirke.get(0).getId());
            } else if (bezirksregionen != null && bezirksregionen.size() > 0) {
                Topic bezirksregion = bezirksregionen.get(0);
                log.info("Initializing filter LIST for regionId=\"" + bezirksregion.getId() + "\" and user \"" + accesscl.getUsername() + "\"");
                viewData("viewName", bezirksregion.getSimpleValue().toString());
                return preparePublicFilterList(bezirksregion.getId());
            }
        }
        log.info("Initializing filter LIST for districtId=\"" + region + "\"");
        return preparePublicFilterList(region);
    }

    /**
     * Responds with a Viewable, the administrative page for managing bezirksregion contacts on the Kiezatlas Website.
     * @return
     */
    @GET
    @Path("/list/bezirksregionen")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareBezirksregionenListing() {
        if (!isAuthenticated()) return getUnauthorizedPage();
        List<RelatedTopic> usersDistricts = getUserDistrictTopics();
        log.info("Initializing listing of BEZIRKSRGEIONEN/ANSPRECHPARTNER...");
        long districtId = -1;
        if (usersDistricts != null && usersDistricts.size() > 0) {
            districtId = usersDistricts.get(0).getId();
        }
        return prepareBezirksregionenListing(districtId);
    }

    @GET
    @Path("/list/bezirksregionen/{districtId}")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareBezirksregionenListing(@PathParam("districtId") long districtId) {
        if (!isAuthenticated()) return getUnauthorizedPage();
        List<RelatedTopic> usersDistricts = getUserDistrictTopics();
        if (districtId != -1 && districtId != 0) {
            // Return bezirksregion for district requestetd
            return prepareBezirksregionListingPage(districtId);
        } else if (usersDistricts != null && usersDistricts.size() > 0) {
            // Return bezirksregionen of the first district user is related to
            return prepareBezirksregionListingPage(usersDistricts.get(0).getId());
        } else {
            // Return unauthorized page
            return prepareBezirksregionListingPage(-1);
        }
    }

    /**
     * Responds with a Viewable, the administrative confirmation page of the Kiezatlas Website.
     * @return
     */
    @GET
    @Path("/list/hinweise")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareCommentsListing() {
        if (!isAuthenticated() && isCommentEditor()) return getUnauthorizedPage();
        List<RelatedTopic> usersDistricts = getUserDistrictTopics();
        log.info("Initializing listing of BearbeitungsHINWEISE ...");
        long districtId = -1;
        if (usersDistricts != null && usersDistricts.size() > 0) {
            districtId = usersDistricts.get(0).getId();
        }
        return prepareCommentsListing(districtId);
    }

    /** Responds with a Viewable, the administrative confirmation page of the Kiezatlas Website.
     * @return
     */
    @GET
    @Path("/list/freischalten")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareConfirmationListing() {
        if (!isAuthenticated() && isConfirmationWorkspaceMember()) return getUnauthorizedPage();
        List<RelatedTopic> usersDistricts = getUserDistrictTopics();
        long regionId = -1;
        if (usersDistricts != null && usersDistricts.size() > 0) {
            regionId = usersDistricts.get(0).getId();
        }
        String logMessage = (regionId == -1) ? " complete listing of NEUEINTRAGUNGEN in Bezirk" : " listing of NEUEINTRAGUNGEN per Bezirksregion";
        log.info("LOAD " + logMessage);
        return prepareConfirmationListing(regionId);
    }

    @GET
    @Path("/list/hinweise/{districtId}")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareCommentsListing(@PathParam("districtId") long districtId) {
        // TODO: Check if user isCommentsWorkspaceMember...
        if (!isAuthenticated()) return getUnauthorizedPage();
        if (isUserAssociatedWithBezirk(districtId)) {
            List<EinrichtungView> results = getCommentedEinrichtungList(districtId);
            viewData("districtId", districtId);
            viewData("name", "Bearbeitungshinweise");
            return getCommentsTemplate(results);
        }
        viewData("name", "Kommentare einsehen");
        viewData("message", "Ihr Account scheint noch nicht als Bezirk-Administrator_in eingerichtet zu sein. "
            + "Wenden Sie sich bitte an die Administrator_innen.");
        return getSimpleMessagePage();
    }

    @GET
    @Path("/list/ansprechpartner")
    @Produces(MediaType.TEXT_HTML)
    public Viewable prepareAssignmentListing() {
        if (isConfirmationWorkspaceMember()) {
            viewData("confirmationMembers", getAngeboteMembers());
            return getAssignmentTemplate();
        }
        viewData("name", "AnsprechpartnerInnen verwalten");
        viewData("message", "Ihr Account scheint noch nicht als Bezirk-Administrator_in eingerichtet zu sein. "
            + "Wenden Sie sich bitte an die Administrator_innen.");
        return getSimpleMessagePage();
    }

    // ----------------------------------------------------------------------------------------- AJAX Endpoints ------/

    @GET
    @Path("/sites/json")
    @Produces(MediaType.APPLICATION_JSON)
    public List<Topic> getSites() {
        List<Topic> sites = new ArrayList<Topic>();
        if (isSiteEditor()) {
            sites = dm4.getTopicsByType("ka2.website");
            DeepaMehtaUtils.loadChildTopics(sites);
        }
        return sites;
    }

    @GET
    @Path("/list/assignments/{geoObjectId}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<RelatedTopic> prepareAssignmentListing(@PathParam("geoObjectId") long geoObjectId) {
        List<RelatedTopic> assignedUsers = new ArrayList<RelatedTopic>();
        if (!isConfirmationWorkspaceMember()) {
            return assignedUsers;
        }
        Topic geoObject = dm4.getTopic(geoObjectId);
        return getAssignedUsernames(geoObject);
    }

    @GET
    @Path("/search-keywords")
    @Produces(MediaType.APPLICATION_JSON)
    public SearchKeywords getSearchKeywords(@HeaderParam("Referer") String referer, @QueryParam("query") String query) {
        SearchKeywords keywords = new SearchKeywords();
        List<Topic> categories = null;
        if (query == null) {
            categories = etl.searchCategoryNames(referer, "*");
        } else {
            categories = etl.searchCategoryNames(referer, query);
        }
        for (Topic category : categories) {
            keywords.addKeyword(category.getTypeUri(), category.getSimpleValue().toString());
        }
        log.info("Build up list of " + keywords.size() + " search-keywords");
        return keywords;
    }

    /**
     * Loads site info object for a given kieatlas site web alias.
     *
     * @param pageAlias  String  ka2.website.web_alias
     * @return
     */
    @GET
    @Path("/info/{webAlias}")
    @Produces(MediaType.APPLICATION_JSON)
    public CitymapView getSiteInfo(@PathParam("webAlias") String pageAlias) {
        CitymapView result = null;
        try {
            Topic webAlias = dm4.getTopicByValue("ka2.website.web_alias", new SimpleValue(pageAlias));
            Topic site = webAlias.getRelatedTopic("dm4.core.composition", CHILD_ROLE,
                PARENT_ROLE, "ka2.website");
            log.info("Identified Kiezatlas Website: " + site.getSimpleValue());
            if (site != null) {
                result = new CitymapView(site);
            }
        } catch (NoSuchElementException nsex) {
            log.warning("Probably this web alias is not unique among websites: " + nsex.getLocalizedMessage());
        }
        return result;
    }

    /**
     * Loads geo objects for a given kieatlas site web alias.
     *
     * @param siteId long   Topic id of Kiezatlas Website Topic
     * @return
     */
    @GET
    @Path("/{siteId}/geo/{categoryId}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<GeoMapView> getSiteGeoObjectsInCategory(@HeaderParam("Referer") String referer,
            @PathParam("siteId") long siteId, @PathParam("categoryId") long categoryId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        Topic category = dm4.getTopic(categoryId);
        Topic site = dm4.getTopic(siteId);
        log.info("Attempting to load a category's geo objects \"" + category.getSimpleValue() + "\" in site " + site.getSimpleValue());
        // populate new resultset
        List<GeoMapView> results = new ArrayList<GeoMapView>();
        List<RelatedTopic> geoObjects = kiezatlas.getGeoObjectsBySite(siteId);
        for (RelatedTopic geoObject : geoObjects) {
            if (isGeoObjectTopic(geoObject) && isAggregatingChildTopic(geoObject, categoryId)) {
                results.add(new GeoMapView(geoObject, geomaps));
            }
        }
        log.info("Loaded " + results.size() + " geo object for category \""
            + category.getSimpleValue() + "\" in site " + site.getSimpleValue());
        return results;
    }

    /**
     * Loads geo objects for a given kieatlas site web alias.
     * Cache of geo objects in citymap is emptied on bundle-refresh or every 6 hrs.
     *
     * @param siteId long   Topic id of Kiezatlas Website Topic
     * @return
     */
    @GET
    @Path("/{siteId}/geo")
    @Transactional
    @Produces(MediaType.APPLICATION_JSON)
    public List<GeoMapView> getSiteGeoObjects(@HeaderParam("Referer") String referer, @PathParam("siteId") long siteId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        // ### TODO: Make "Cache Site" an option of "Kiezatlas Website" topic
        // use cache
        Topic site = dm4.getTopic(siteId);
        // Do not cache Showcase Stadtplan "VSKA Stadtteilzentren"
        if (citymapCache.containsKey(siteId)) {
            // caching lifetime is 30 000 or 12 000 ms for testing purposes
            if (citymapCachedAt.get(siteId) > new Date().getTime() - 21600000) { // 21600000 for approx. 6hr in ms
                log.info("Using cached geo objects for site \"" + site.getSimpleValue()
                        + "\" cachedAt: " + new Date(citymapCachedAt.get(siteId)).toString());
                return citymapCache.get(siteId);
            }
            // invalidate cache
            citymapCache.remove(siteId);
            citymapCachedAt.remove(siteId);
        }
        refreshAutomaticPopulatedCityMaps(siteId);
        // populate new resultset
        List<GeoMapView> results = new ArrayList<GeoMapView>();
        try {
            log.info("Attempting to load a site's geo objects: " + site.getSimpleValue() + "...");
            List<RelatedTopic> geoObjects = kiezatlas.getGeoObjectsBySite(siteId);
            for (RelatedTopic geoObject : geoObjects) {
                if (isGeoObjectTopic(geoObject)) {
                    results.add(new GeoMapView(geoObject, geomaps));
                }
            }
            log.info("Populated cached list of geo object for site " + site.getSimpleValue());
        } catch (NoSuchElementException nsex) {
            log.warning("Probably this web alias is not unique among websites: " + nsex.getLocalizedMessage());
        }
        // insert new result into cache
        citymapCache.put(siteId, results);
        citymapCachedAt.put(siteId, new Date().getTime());
        return results;
    }

    private void refreshAutomaticPopulatedCityMaps(long siteId) {
        Topic vskaCitymap = dm4.getTopicByUri(VSKA_WEBSITE_URI);
        if (siteId == vskaCitymap.getId()) {
            log.info("### UPDATING VskA Kiezatlas Stadtteil und Gemeinwesenarbeit...");
            updateVskAStadtplanGeoObjects();
            log.info("### FINISHED updating VskA Kiezatlas Stadtteil und Gemeinwesenarbeit...");
        }
        Topic famportalCitymap = dm4.getTopicByUri(FAMPORTAL_WEBSITE_URI);
        if (siteId == famportalCitymap.getId()) {
            log.info("### UPDATING Familienportal Stadtplan...");
            updateFamportalStadtplanGeoObjects();
            log.info("### FINISHED updating Familienportal Stadtplan...");
        }
    }

    private void updateVskAStadtplanGeoObjects() {
        Topic vskaCityMap = dm4.getTopicByUri(VSKA_WEBSITE_URI);
        List<Topic> angebotFacets = dm4.getTopicsByType("ka2.criteria.angebot");
        for (Topic angebotFacet : angebotFacets) {
            if (isVskACategory(angebotFacet)) {
                List<RelatedTopic> topics = angebotFacet.getRelatedTopics("dm4.core.aggregation",
                        null, null, "ka2.geo_object");
                log.info("> Category CHECK: " + angebotFacet.getSimpleValue() + " is a VsKa Category with "
                        + topics.size() + " geo objects assigned");
                addGeoObjectsToStadtplan(topics, vskaCityMap);
            }
        }
        List<Topic> themaFacets = dm4.getTopicsByType("ka2.criteria.thema");
        for (Topic themaFacet : themaFacets) {
            if (isVskACategory(themaFacet)) {
                List<RelatedTopic> topics = themaFacet.getRelatedTopics("dm4.core.aggregation",
                        null, null, "ka2.geo_object");
                log.info("> Category CHECK: " + themaFacet.getSimpleValue() + " is a VsKa Category with "
                        + topics.size() + " geo objects assigned");
                addGeoObjectsToStadtplan(themaFacet.getRelatedTopics("dm4.core.aggregation",
                        null, null, "ka2.geo_object"), vskaCityMap);
            }
        }
    }

    private void addGeoObjectsToStadtplan(List<RelatedTopic> geoObjects, Topic cityMap) {
        Topic kiezatlasWs = dm4.getTopicByUri(KiezatlasPlugin.KIEZATLAS_WORKSPACE_URI);
        for (RelatedTopic geoObject : geoObjects) {
            Association assignment = kiezatlas.addGeoObjectToWebsite(geoObject, cityMap);
            if (assignment != null) {
                workspaces.assignToWorkspace(assignment, kiezatlasWs.getId());
            }
        }
    }

    private boolean isVskACategory(Topic category) {
        if (category.getSimpleValue().toString().equals("Familien- und Nachbarschaftszentren")
            || category.getSimpleValue().toString().equals("Gemeinwesen")
            || category.getSimpleValue().toString().equals("Kieztreff")
            || category.getSimpleValue().toString().equals("Nachbarschaft und Stadtteil")
            || category.getSimpleValue().toString().equals("Seniorinnen + Senioren")
            || category.getSimpleValue().toString().equals("Familienzentren")
            || category.getSimpleValue().toString().equals("Kieznahe Mehrgenerationenangebote")
            || category.getSimpleValue().toString().equals("Nachbarschaftszentren")
            || category.getSimpleValue().toString().equals("Offene Treffpunkte mit sozialkulturellem Charakter")
            || category.getSimpleValue().toString().equals("Quartiersmanagement")
            || category.getSimpleValue().toString().equals("Sozial-kulturelle Projekte")
            || category.getSimpleValue().toString().equals("Stadtteilarbeit")
            || category.getSimpleValue().toString().equals("Selbsthilfegruppen")) {
            return true;
        } else {
            return false;
        }
    }

    private void updateFamportalStadtplanGeoObjects() {
        // 1) Fetch Famportal Stadtplan Website Topic
        Topic famportalCityMap = dm4.getTopicByUri(FAMPORTAL_WEBSITE_URI);
        Topic famportalWorkspace = dm4.getTopicByUri("de.kiezatlas.familienportal_ws");
        // 2) Giving all existing geo objects with a familienportal category relation a famportal site assignment
        List<Topic> geoObjects = dm4.getTopicsByType("ka2.geo_object");
        for (Topic geoObject : geoObjects) {
            if (isRelatedToFamportalCategory(geoObject)) {
                Association assignment = kiezatlas.addGeoObjectToWebsite(geoObject, famportalCityMap);
                log.info("Assigning Geo Object " + geoObject.getSimpleValue() + " related to Famportal Category"
                    + " to Website \"" + famportalCityMap.getSimpleValue() + "\"");
                if (assignment != null) {
                    workspaces.assignToWorkspace(assignment, famportalWorkspace.getId());
                }
            }
        }
    }

    /* --- Find copy in dm4-kiezatlas-famportal FamilienportalService**/
    private boolean isRelatedToFamportalCategory(Topic geoObject) {
        List<RelatedTopic> facetTopics = facets.getFacets(geoObject, FAMPORTAL_CATEGORY_FACET_URI);
        return (facetTopics.size() >= 1);
    }

    /**
     * @see The JS restclient of Angebote UI (dm4-kiezatlas-angebote).
     * @return A JSON array containing TopicModels each representing a "ka2.geo_object".
     */
    @GET
    @Path("/geo/my/json")
    @Produces(MediaType.APPLICATION_JSON)
    public List<EinrichtungView> getGeoObjectsByUser() {
        List<EinrichtungView> my = new ArrayList<EinrichtungView>();
        Topic username = accesscl.getUsernameTopic();
        if (username != null) {
            List<RelatedTopic> objects = username.getRelatedTopics(USER_ASSIGNMENT, null, null, KiezatlasService.GEO_OBJECT);
            for (RelatedTopic object : objects) {
                EinrichtungView viewModel = assembleEinrichtungListElement(object, false);
                my.add(viewModel);
            }
        }
        return my;
    }

    /**
     * We cache subsequent requests to this method, which means that on the district pages it will take 6 hours until
     * a new index will be generated (and newly added geo objects will appear on the map).
     *
     * Details of existing (but updated) geo objects are not affected by this cache.
     * @param referer
     * @param bezirkId
     */
    @GET
    @Path("/bezirk/{topicId}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<GeoMapView> getGeoObjectsByDistrict(@HeaderParam("Referer") String referer, @PathParam("topicId") long bezirkId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        // use cache
        if (citymapCache.containsKey(bezirkId)) {
            // caching lifetime is 30 000 or 12 000 ms for testing purposes
            if (citymapCachedAt.get(bezirkId) > new Date().getTime() - 21600000) { // 21600000 for approx. 6hr in ms
                log.info("Returning cached list of geo object for district " + bezirkId);
                return citymapCache.get(bezirkId);
            }
            // invalidate cache
            citymapCache.remove(bezirkId);
            citymapCachedAt.remove(bezirkId);
        }
        // populate new resultset
        ArrayList<GeoMapView> results = new ArrayList<GeoMapView>();
        Topic bezirk = dm4.getTopic(bezirkId);
        List<RelatedTopic> geoObjects = bezirk.getRelatedTopics("dm4.core.aggregation",
            CHILD_ROLE, PARENT_ROLE, "ka2.geo_object");
        for (RelatedTopic geoObject : geoObjects) {
            if (isGeoObjectTopic(geoObject)) {
                results.add(new GeoMapView(geoObject, geomaps, angebote));
            }
        }
        log.info("Populating cached list of geo object for district " + bezirkId);
        // insert new result into cache
        citymapCache.put(bezirkId, results);
        citymapCachedAt.put(bezirkId, new Date().getTime());
        return results;
    }

    /**
     * Fetches topic Kiezatlas Geo Object topic in context of a given site.
     *
     * @param referer
     * @param topicId
     * @param siteId
     * @return A GeoObject DetailsView as DTO to presend details about a place.
     */
    @GET
    @Path("/geo/{topicId}/facetted/{siteId}")
    @Produces(MediaType.APPLICATION_JSON)
    public Topic getFacettedGeoObjectTopic(@HeaderParam("Referer") String referer, @PathParam("topicId") String topicId,
                                           @PathParam("siteId") long siteId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        Topic geoObject = getFacettedGeoObjectTopic(topicId, siteId);
        return geoObject;
    }

    @Override
    public Topic getFacettedGeoObjectTopic(String topicId, long siteId) {
        Topic geoObject = getGeoObjectById(topicId);
        Topic website = dm4.getTopic(siteId);
        if (isGeoObjectTopic(geoObject) && website.getTypeUri().equals("ka2.website")) {
            kiezatlas.enrichWithFacets(geoObject, siteId);
        }
        return geoObject;
    }

    @POST
    @Path("/assign/{topicId}/{userId}")
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Response createUserAssignment(@PathParam("topicId") long topicId, @PathParam("userId") long userId) {
        if (isConfirmationWorkspaceMember()) { // && isSiteEditor()
            // Create user assignment in "Kiezatlas" workspace ...
            Topic refTopic = dm4.getTopic(topicId);
            Topic userPlayer = dm4.getTopic(userId);
            // 1) Assignment Player is "Geo Object"
            if (refTopic.getTypeUri().equals(GEO_OBJECT)) {
                Topic bezirk = getRelatedBezirk(refTopic);
                Topic bezirksregion = getRelatedBezirksregion(refTopic);
                if (bezirk == null && bezirksregion == null) {
                    log.warning("Geo Object is neither in any Bezirk nor in any Bezirksregion. "
                        + "Can not create ansprechpartner-assignment because we have no one with permission");
                } else if ((bezirk != null && isUserAssociatedWithBezirk(bezirk.getId()))
                        || (bezirksregion != null && isUserAssociatedWithBezirksregion(bezirksregion.getId()))) {
                    Association assoc = createUserAssignment(refTopic, userPlayer, true);
                    if (assoc != null) {
                        log.info("ASSIGNED userRef " + userPlayer.getSimpleValue() + " with topic " + refTopic.getSimpleValue());
                        return Response.ok(assoc.getId()).build();
                    }
                }
            // 2) Assignment Player is of Type "Bezirksregion Name"
            } else if (refTopic.getTypeUri().equals(BEZIRKSREGION_NAME)) {
                Association assoc = createUserAssignment(refTopic, userPlayer, true);
                if (assoc != null) {
                    log.info("ASSIGNED userRef " + userPlayer.getSimpleValue() + " with topic " + refTopic.getSimpleValue());
                    // create confirm workspace membership
                    if (!isConfirmationWorkspaceMember(userPlayer)) {
                        accesscl.createMembership(userPlayer.getSimpleValue().toString()
                            , getConfirmationWorkspace().getId());
                        log.info("Additionally CREATED Confirmation Workspace Membership for user " + accesscl.getUsername());
                    }
                    return Response.ok(assoc.getId()).build();
                }
            }
            log.warning("Did not create user_assignment cause the user has no association to corresponding region");
            return Response.serverError().build();
        } else {
            log.warning("Unauthorized attempt to create a user assignment between topicId=" + topicId
                + " and user \"" + dm4.getTopic(userId).getSimpleValue() + "\"");
            return Response.status(401).build();
        }
    }

    @DELETE
    @Path("/assign/{topicId}/{userId}")
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Response deleteUserAssignment(@PathParam("topicId") long topicId, @PathParam("userId") long userId) {
        if (isConfirmationWorkspaceMember()) { // getUserDistrictTopics()
            Topic user = dm4.getTopic(userId);
            Topic topicRef = dm4.getTopic(topicId);
            Association assoc = deleteUserAssignment(topicRef, user);
            if (assoc != null) {
                if (topicRef.getTypeUri().equals(BEZIRKSREGION_NAME)) {
                    log.info("Check if CONFIRMATION WORKSPACE Membership is to be removed for " + accesscl.getUsername());
                    List<RelatedTopic> bezirksregionen = getUserSubregionTopics(user);
                    if (bezirksregionen.isEmpty()) {
                        // ### Remove Membership
                        log.info("CONFIRMATION WORKSPACE Membership should be removed for " + accesscl.getUsername());
                    }
                }
                return Response.ok(assoc.getId()).build();
            } else {
                return Response.serverError().build();
            }
        } else {
            log.warning("Unauthorized attempt to create a user assignment between topicId=" + topicId
                + " and user \"" + dm4.getTopic(userId).getSimpleValue() + "\"");
            return Response.status(401).build();
        }
    }

    @GET
    @Path("/list/manager/{districtId}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<Topic> getConfirmationWorkspaceMembers() {
        List<Topic> result = new ArrayList<Topic>();
        if (!isConfirmationWorkspaceMember()) return result;
        log.info("LOAD listing of ALL potential Kiezatlas MANAGER");
        List<Topic> usernames = dm4.getTopicsByType("dm4.accesscontrol.username");
        for (Topic username : usernames) {
            if (isConfirmationWorkspaceMember(username)) {
                result.add(username);
            }
        }
        if (result.isEmpty()) {
            log.warning("Fetching Kiezatlas confirmation membership Usernames FAILED - 0 Results");
        } else {
            log.warning("Sorting usernames in confirmation workspace...");
            sortAlphabeticalDescending(result);
        }
        return result;
    }

    @GET
    @Path("/list/accounts")
    @Produces(MediaType.APPLICATION_JSON)
    public List<Topic> getAngeboteMembers() {
        List<Topic> result = new ArrayList<Topic>();
        if (!isConfirmationWorkspaceMember()) return result;
        log.info("LOAD listing of ALL potential Kiezatlas data-owner");
        List<Topic> usernames = dm4.getTopicsByType("dm4.accesscontrol.username");
        for (Topic username : usernames) {
            if (angebote.isAngeboteWorkspaceMember(username.getSimpleValue().toString())) {
                result.add(username);
            }
        }
        if (result.isEmpty()) {
            log.warning("Fetching Kiezatlas angebote workspace members FAILED - 0 Results");
        } else {
            log.warning("Sorting all usernames in angebote workspace...");
            sortAlphabeticalDescending(result);
        }
        return result;
    }

    @GET
    @Path("/menu")
    @Produces(MediaType.APPLICATION_JSON)
    public String getAccountPermissionInfo() {
        String failureMessage = "{ \"status\": \"Permission check failed\" }";
        if (!isAuthenticated()) return failureMessage;
        try {
            JSONObject info = new JSONObject();
            info.put("confirmation", isConfirmationWorkspaceMember());
            // info.put("comments", isCommentEditor());
            info.put("bezirke", DeepaMehtaUtils.toJSONArray(getUserDistrictTopics()));
            info.put("bezirksregionen", DeepaMehtaUtils.toJSONArray(getUserSubregionTopics()));
            return info.toString();
        } catch (JSONException ex) {
            Logger.getLogger(WebsitePlugin.class.getName()).log(Level.SEVERE, null, ex);
            return failureMessage;
        }
    }

    // --------------------------------- Allows Kiezatlas Website Visitors to provide editorial hints per place ----- //

    @POST
    @Path("/comment/{geoObjectId}/{commentUri}/{message}/{contact}")
    @Transactional
    public Response createGeoObjectComment(@HeaderParam("Referer") String referer, @PathParam("geoObjectId") String geoObjectId,
                                           @PathParam("commentUri") String topicUri, @PathParam("message") String message, @PathParam("contact") String contact) {
        Topic geoObject = getGeoObjectById(geoObjectId);
        if (geoObject == null) {
            return Response.status(404).build();
        } else if (message.isEmpty()) {
            return Response.status(400).build();
        } else if (geoObject.getTypeUri().equals(KiezatlasService.GEO_OBJECT)) {
            log.info("Comment: Received message from \""+contact+"\" on topic \"" + geoObject.getSimpleValue() + "\", referring to topicUri=" + topicUri);
            Topic topic = comments.createComment(geoObject.getId(), message, contact); // ### topicUri
            if (topic != null) {
                return Response.noContent().build();
            } else {
                return Response.status(401).build();
            }
        } else {
            log.severe("Prevented a comment targeted to a non geo topic by user \"" + accesscl.getUsername() + "\"");
            return Response.status(401).build();
        }
    }

    /** @POST
    @Path("/geoobject/claim/{username}/{mailbox}/{geoObjectId}")
    @Transactional
    public Viewable initiateGeoObjectRecovery(@PathParam("username") String username, @PathParam("mailbox") String mailbox,
                                              @PathParam("geoObjectId") long geoObjectId, String password) {
        Topic geoObject = dm4.getTopic(geoObjectId);
        Topic bezirk = getRelatedBezirk(geoObject);
        if (isSiteEditor() || (isUserAssociatedWithBezirk(bezirk.getId()) && isConfirmationWorkspaceMember())) {
            if (isGeoObjectTopic(geoObject) && isKiezatlas1Entry(geoObject)) {
                // ### Cceck if site or district manager is responsible for this geo object through using district check
                log.info("Attempt to create new account \""+username+"\" and kiezatlas1 geo object \""+geoObject.getSimpleValue()+"\"");
                log.info("DEBUG: Posted pwd " + password);
                String finalUsername = (signup.isUsernameTaken(username.trim())) ? username.trim() : username.trim() + "1";
                if (!signup.isMailboxTaken(mailbox.trim())) { // mailbox NOT taken
                    if (!password.isEmpty() && password.length() > 7) {
                        log.info("Creating new account \""+username+"\" request");
                        String newUser = signup.createSimpleUserAccount(finalUsername, password, mailbox);
                        createUserAssignment(geoObject, dm4.getAccessControl().getUsernameTopic(newUser), true);
                        // log.info("Store recovery token for kiezatlas1 geo object \""+geoObject.getId()+"\"");
                        // createGeoObjectRecoveryToken(finalUsername, geoObjectId);
                        // sendUserInformation
                    } else {
                        log.warning("New account for geo object recovery not created, user account password too weak.");
                    }
                } else { // mailbox already registered, use that user account
                    String existingUser = dm4.getAccessControl().getUsername(mailbox.trim());
                    createUserAssignment(geoObject, dm4.getAccessControl().getUsernameTopic(existingUser), true);
                }
            } else {
                viewData("message", "...");
            }
        } else {
            viewData("message", "...");
        }
        return getSimpleMessagePage();
    }

    /** private void createGeoObjectRecoveryToken(String username, long geoObjectId) {
        try {
            String key = UUID.randomUUID().toString();
            long valid = new Date().getTime() + 604800000; // Token is valid up to 7days
            JSONObject value = new JSONObject()
                    .put("username", username.trim())
                    .put("geoObjectId", geoObjectId)
                    .put("expiration", valid);
            recoveryToken.put(key, value);
            log.log(Level.INFO, "Set up token {0} for geo object \"{1}\", valid till {3}",
                    new Object[]{key, geoObjectId, new Date(valid).toString()});
        } catch (JSONException ex) {
            Logger.getLogger(SignupPlugin.class.getName()).log(Level.SEVERE, null, ex);
            throw new RuntimeException(ex);
        }
    } **/

    // --- Bezirks and Region Specific Resources

    @GET
    @Path("/bezirk")
    @Produces(MediaType.APPLICATION_JSON)
    public List<BezirkView> fetchKiezatlasDistricts() {
        ArrayList<BezirkView> results = new ArrayList<BezirkView>();
        for (Topic bezirk : dm4.getTopicsByType(BEZIRK)) {
            results.add(new BezirkView(bezirk));
        }
        return results;
    }

    @GET
    @Path("/bezirksregion")
    @Produces(MediaType.APPLICATION_JSON)
    public List<Topic> fetchKiezatlasSubregions() {
        return dm4.getTopicsByType(BEZIRKSREGION_NAME);
    }

    @GET
    @Path("/bezirksregion/{topicId}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<GeoMapView> getGeoObjectsBySubregion(@HeaderParam("Referer") String referer, @PathParam("topicId") long bezirksregionId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        ArrayList<GeoMapView> results = new ArrayList<GeoMapView>();
        Topic bezirksregion = dm4.getTopic(bezirksregionId);
        List<RelatedTopic> geoObjects = bezirksregion.getRelatedTopics("dm4.core.aggregation",
            CHILD_ROLE, PARENT_ROLE, GEO_OBJECT);
        for (RelatedTopic geoObject : geoObjects) {
            if (isGeoObjectTopic(geoObject)) {
                results.add(new GeoMapView(geoObject, geomaps, angebote));
            }
        }
        return results;
    }

    @GET
    @Path("/bezirk/{districtId}/bezirksregionen")
    @Produces(MediaType.APPLICATION_JSON)
    public List<BezirksregionView> getKiezatlasBezirksregionen(@PathParam("districtId") long districtId) {
        List<Topic> bezirksregionen = dm4.getTopicsByType(BEZIRKSREGION_NAME);
        List<BezirksregionView> regionen = new ArrayList<BezirksregionView>();
        Topic district = dm4.getTopic(districtId);
        log.info("LOAD listing of BEZIRKSRGEIONEN/ANSPRECHPARTNER... for Bezirk \"" + district + "\" (\"" + districtId + "\")");
        for (Topic bezirksregionName : bezirksregionen) {
            Topic bezirksUtilName = getBezirksUtilName(bezirksregionName);
            if (bezirksUtilName.getSimpleValue().toString().equals(district.getSimpleValue().toString())) {
                // Migraton14: Introduced new "Bezirksregion Name" Facet topics to all Geo Objects
                BezirksregionView regionViewModel = new BezirksregionView(bezirksregionName);
                regionViewModel.setBezirk(district);
                regionViewModel.setAnsprechpartner(bezirksregionName.getRelatedTopics(USER_ASSIGNMENT));
                List<RelatedTopic> geoObjects = bezirksregionName.getRelatedTopics("dm4.core.aggregation", null,
                   null, GEO_OBJECT);
                sortAlphabeticalDescending(geoObjects);
                regionViewModel.setGeoObjects(geoObjects);
                regionen.add(regionViewModel);
                log.info("LOADed " + geoObjects.size() + " geo objects for Bezirksregion Name \"" + bezirksregionName.getSimpleValue() + "\")");
            }
        }
        if (regionen.isEmpty()) {
            log.warning("Fetching Bezirksregionen by LOR Utils Bezirk's Name FAILED - 0 Results");
        }
        return regionen;
    }

    // ---------------------------------- Website Place Search Endpoints ------------------------------------------- //

    /**
     * Builds up a list of search results (Geo Objects to be displayed in a map) by text query.
     * @param referer
     * @param query
     */
    @GET
    @Path("/search")
    @Produces(MediaType.APPLICATION_JSON)
    public List<GeoMapView> searchGeoObjectsFulltext(@HeaderParam("Referer") String referer,
                                                     @QueryParam("search") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            String queryValue = query.trim();
            ArrayList<GeoMapView> results = new ArrayList<GeoMapView>();
            if (isInvalidSearchQuery(queryValue)) return results;
            // 2) Fetch unique geo object topics by text query string (leading AND ending ASTERISK)
            List<Topic> geoObjects = searchFulltextInGeoObjectChilds(queryValue, false, true, false, true);
            /** List<Topic> relatedGeoObjects = etl.searchFulltextInCategories(referer, query);
            geoObjects.addAll(relatedGeoObjects); **/
            // 3) Process saerch results and create DTS for map display
            for (Topic topic : geoObjects) {
                if (isGeoObjectTopic(topic)) {
                    results.add(new GeoMapView(topic, geomaps, angebote));
                }
            }
            log.info("Build up response " + results.size() + " geo objects across all districts");
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics failed", e);
        }
    }

    /**
     * Builds up a list of search results (Geo Objects to be displayed in a map) by district
     * topic id and text query.
     * @param referer
     * @param contextId
     * @param query
     */
    @GET
    @Path("/search/{contextId}")
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public List<GeoMapView> searchGeoObjectsFulltextInContext(@HeaderParam("Referer") String referer,
            @PathParam("contextId") long contextId, @QueryParam("search") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            ArrayList<GeoMapView> results = new ArrayList<GeoMapView>();
            String queryValue = query.trim();
            if (isInvalidSearchQuery(queryValue)) return results;
            // DO fulltext saerch with simple ASTERISK at the END
            List<Topic> geoObjects = searchFulltextInGeoObjectChilds(queryValue, false, true, false, true);
            /** List<Topic> relatedGeoObjects = etl.searchFulltextInCategories(referer, query);
            geoObjects.addAll(relatedGeoObjects); **/
            log.info("Start building response for " + geoObjects.size() + " and FILTER by CONTEXT");
            for (Topic geoObject: geoObjects) {
                // checks for district OR site relation
                if (hasRelatedTopicAssociatedAsChild(geoObject, contextId)) {
                    if (isGeoObjectTopic(geoObject)) {
                        results.add(new GeoMapView(geoObject, geomaps, angebote));
                    }
                }
            }
            log.info("Build up response " + results.size() + " geo objects in context=\""+contextId+"\"");
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics failed", e);
        }
    }



    /*** ------------ Start of specialized (other than fulltext search for geo objects) search endpoints --------- ***/

    /**
     * Fetches a list of Geo Objects for assignment used in Angebotszeitraum editor.
     * @param referer
     * @param query
     */
    @GET
    @Path("/search/name")
    @Produces(MediaType.APPLICATION_JSON)
    public List<GeoMapView> searchGeoObjectsByExactName(@HeaderParam("Referer") String referer,
                                                        @QueryParam("query") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            log.log(Level.INFO, "> placeNameQuery=\"{0}\"", query);
            String queryValue = query.trim();
            ArrayList<GeoMapView> results = new ArrayList<GeoMapView>();
            if (isInvalidSearchQuery(queryValue)) return results;
            // DO Search for //EXACT// in Name ONLY (if "Not Empty" AND "Without ASTERISK")
            String queryPhrase = preparePhraseOrTermLuceneQuery(queryValue);
            List<Topic> singleTopics = dm4.searchTopics(queryPhrase, "ka2.geo_object.name");
            log.log(Level.INFO, "{0} name topics found", singleTopics.size());
            for (Topic topic : singleTopics) {
                Topic geoObject = getParentGeoObjectTopic(topic);
                results.add(new GeoMapView(geoObject, geomaps, angebote));
            }
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics by name failed", e);
        }
    }

    /**
     * Fetches a combined list of Geo Objects and Angebote to be displayed in two-tier dropdown menu.
     * @param referer
     * @param query
     */
    @GET
    @Path("/search/name/quick")
    @Produces(MediaType.APPLICATION_JSON)
    public SearchResultList getSearchResultListByNameQuick(@HeaderParam("Referer") String referer,
                                                           @QueryParam("query") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        SearchResultList results = new SearchResultList();
        try {
            String queryValue = query.trim();
            if (isInvalidSearchQuery(queryValue)) return results;
            // DO Search for "Not Empty" AND "WITH ASTERISK ON BOTH SIDES" in NAME ONLY
            queryValue = preparePhraseOrTermLuceneQuery(queryValue);
            log.log(Level.INFO, "> placeNameSearchQuick=\"{0}\"", queryValue);
            List<Topic> singleTopics = dm4.searchTopics(queryValue, "ka2.geo_object.name");
            int max = 50;
            int count = 0;
            for (Topic topic : singleTopics) {
                Topic geoObject = getParentGeoObjectTopic(topic);
                if (geoObject != null) {
                    Topic bezirk = getRelatedBezirk(geoObject);
                    Topic street = getRelatedAddressStreetName(geoObject);
                    String zusatzInfo = "";
                    if (street != null) zusatzInfo += street.getSimpleValue();
                    if (bezirk != null) zusatzInfo += ", " + bezirk.getSimpleValue().toString();
                    results.putGeoObject(new SearchResult(geoObject, zusatzInfo));
                    count++;
                }
                if (count == max) break;
            }
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object for auto completion failed", e);
        }
        return results;
    }

    /**
     * Fetches a list of Geo Objects possibly existing for /geo/create form.
     * Search on Place Edit Form Name Input
     * @param referer
     * @param geoObjectName
     */
    @GET
    @Path("/search/name/duplicates")
    @Produces(MediaType.APPLICATION_JSON)
    public List<GeoMapView> searchGeoObjectsByLooseName(@HeaderParam("Referer") String referer,
                                                        @QueryParam("geoobject") String geoObjectName) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            // strip common prefixes as they irritate our search fo rduplicates leading to to many results
            String queryValue = geoObjectName.replace("e.V.", "").replace("gGmbh", "").toLowerCase().trim();
            ArrayList<GeoMapView> results = new ArrayList<GeoMapView>();
            log.log(Level.INFO, "> placeNameDuplicatesQuery=\"{0}\"", queryValue + "\" to find duplicates");
            if (isInvalidSearchQuery(queryValue)) return results;
            // DO Search IF "AT LEAST 3 Chars" BUT WITH "ASTERISK AT THE END" in NAME ONLY
            String queryPhrase = prepareLuceneQueryString(queryValue, false, true, false, false);
            List<Topic> singleTopics = dm4.searchTopics(queryPhrase, "ka2.geo_object.name");
            log.log(Level.INFO, "{0} geo objects found by name", singleTopics.size());
            // TODO: sort resutls albhabetically
            sortAlphabeticalDescending(singleTopics);
            for (Topic topic : singleTopics) {
                Topic geoObject = getParentGeoObjectTopic(topic);
                results.add(new GeoMapView(geoObject, geomaps));
            }
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics by name failed", e);
        }
    }

    /**
     * Fetches a list of Address / Street topics for the given name query.
     * @param referer
     * @param streetName
     */
    @GET
    @Path("/search/name/street")
    @Produces(MediaType.APPLICATION_JSON)
    public List<Topic> searchStreetAddressTopics(@HeaderParam("Referer") String referer,
                                                     @QueryParam("name") String streetName) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            // strip common prefixes as they irritate our search fo rduplicates leading to to many results
            String queryValue = streetName;
            List<Topic> results = new ArrayList<Topic>();
            if (isInvalidSearchQuery(queryValue)) return results;
            String queryPhrase = preparePhraseOrTermLuceneQuery(queryValue);
            log.log(Level.INFO, "> addressSearchByStreetName=\"{0}\"", queryValue + "\"");
            List<Topic> streets = dm4.searchTopics(queryPhrase, "dm4.contacts.street");
            log.log(Level.INFO, streets.size() + " street topics found");
            return streets;
        } catch (Exception e) {
            throw new RuntimeException("Searching address topics by street name failed", e);
        }
    }

    /**
     * Fetches a list of Bezirksregionen topics for the given name query.
     * Search on Place Edit Form Name Input
     * @param referer
     * @param regionName
     */
    @GET
    @Path("/search/name/region")
    @Produces(MediaType.APPLICATION_JSON)
    public List<Topic> searchBezirskregionenTopics(@HeaderParam("Referer") String referer,
                                                     @QueryParam("name") String regionName) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            // strip common prefixes as they irritate our search fo rduplicates leading to to many results
            String queryValue = regionName;
            List<Topic> results = new ArrayList<Topic>();
            if (isInvalidSearchQuery(queryValue)) return results;
            String queryPhrase = preparePhraseOrTermLuceneQuery(queryValue);
            log.log(Level.INFO, "> bezirksregionSearchByName=\"{0}\"", queryValue + "\"");
            List<Topic> bezirksregionen = dm4.searchTopics(queryPhrase, "ka2.bezirksregion");
            log.log(Level.INFO, bezirksregionen.size() + " bezirksregionen found");
            return bezirksregionen;
        } catch (Exception e) {
            throw new RuntimeException("Searching bezirksregionen by name failed", e);
        }
    }

    /**
     * Fetches a list of Geo Objects related to the given street name.
     * Search on Place Edit Form Name Input
     * @param referer
     * @param streetName
     */
    @GET
    @Path("/search/street")
    @Produces(MediaType.APPLICATION_JSON)
    public List<GeoMapView> searchGeoObjectsByStreetName(@HeaderParam("Referer") String referer,
                                                         @QueryParam("name") String streetName) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            // strip common prefixes as they irritate our search fo rduplicates leading to to many results
            String queryValue = streetName;
            ArrayList<GeoMapView> results = new ArrayList<GeoMapView>();
            if (isInvalidSearchQuery(queryValue)) return results;
            String queryPhrase = preparePhraseOrTermLuceneQuery(queryValue);
            log.log(Level.INFO, "> placeSearchByStreetName=\"{0}\"", queryValue + "\"");
            List<Topic> streets = dm4.searchTopics(queryPhrase, "dm4.contacts.street");
            List<RelatedTopic> places = getStreetNameRelatedGeoObjects(streets);
            log.log(Level.INFO, places.size() + " geo objects found in " + streets.size() + " streets ");
            // TODO: sort resutls albhabetically
            sortAlphabeticalDescending(places);
            for (Topic place : places) {
                results.add(new GeoMapView(place, geomaps));
            }
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics by streetn name failed", e);
        }
    }

    /**
     * Fetches a list of Geo Objects related to the given name of the region (Bezirksregion or LOR/Planungsraum).
     * Search on Place Edit Form Name Input
     * @param referer
     * @param regionName
     */
    @GET
    @Path("/search/region")
    @Produces(MediaType.APPLICATION_JSON)
    public List<GeoMapView> searchGeoObjectsByBezirksregionName(@HeaderParam("Referer") String referer,
                                                                @QueryParam("name") String regionName) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            // strip common prefixes as they irritate our search fo rduplicates leading to to many results
            String queryValue = regionName;
            ArrayList<GeoMapView> results = new ArrayList<GeoMapView>();
            if (isInvalidSearchQuery(queryValue)) return results;
            String queryPhrase = preparePhraseOrTermLuceneQuery(queryValue);
            log.log(Level.INFO, "> placeSearchByRegionName=\"{0}\"", queryValue + "\"");
            List<Topic> bezirksregionen = dm4.searchTopics(queryPhrase, "ka2.bezirksregion");
            /** List<Topic> lor_names = dm4.searchTopics(queryPhrase, "ka2.util.lor_name");
            List<Topic> lor_numbers = dm4.searchTopics(queryPhrase, "ka2.lor_nummer"); **/
            List<RelatedTopic> places = getRegionRelatedGeoObjects(bezirksregionen);
            log.log(Level.INFO, places.size() + " geo objects found in " + bezirksregionen.size() + " bezirksregionen");
            // TODO: sort resutls albhabetically
            sortAlphabeticalDescending(places);
            for (Topic place : places) {
                results.add(new GeoMapView(place, geomaps));
            }
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics by region name failed", e);
        }
    }

    // -------------------------- Website Angebote Search Endpoints ------------------------------ //

    /**
     * Builds up a list of search results (Geo Objects to be displayed in a map) by text query.
     * @param referer
     * @param query
     */
    @GET
    @Path("/search/angebote")
    @Produces(MediaType.APPLICATION_JSON)
    public List<GeoMapView> searchAngebotsinfosFulltext(@HeaderParam("Referer") String referer,
                                                        @QueryParam("search") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            ArrayList<GeoMapView> results = new ArrayList<GeoMapView>();
            if (isInvalidSearchQuery(query)) return results;
            // String queryValue = prepareLuceneQueryString(query, false, true, false, true);
            String queryValue = preparePhraseOrTermLuceneQuery(query);
            log.log(Level.INFO, "> fulltextEventQuery=\"{0}\"", queryValue);
            // 2) Fetch unique geo object topics by text query string (leading AND ending ASTERISK)
            List<RelatedTopic> offers = angebote.searchInAngebotsinfoChildsByText(queryValue);
            // 3) Process saerch results and create DTS for map display
            for (Topic angebot : offers) {
                List<RelatedTopic> places = angebote.getAssignedGeoObjectTopics(angebot);
                if (places != null && places.size() > 0) {
                    GeoMapView angebotLocation = new GeoMapView(places.get(0), geomaps, angebote);
                    angebotLocation.setAngebotSearchName(angebot.getSimpleValue().toString());
                    results.add(angebotLocation);
                }
            }
            log.info("Build up response " + offers.size() + " geo objects across all districts");
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics failed", e);
        }
    }

    /*** ------------------------- Geo Object Fulltext Search Implementation ----------------------------- **/

    /**
     * Fires searchTopic()-calls to find Geo Object topics by their:
     * <ul>
     *  <li>Geo Object Name</li>
     *  <li>Beschreibung Facet</li>
     *  <li>Stichworte Facet</li>
     *  <li>Bezirksregion Facet</li>
     *  <li>Straßenname</li>
     * </ul>
     * @param query
     * @return A list of unique topics of type "ka2.geo_object".
     */
    @Override
    @Produces(MediaType.APPLICATION_JSON)
    public List<Topic> searchFulltextInGeoObjectChilds(String query, boolean doSplitWildcards, boolean appendWildcard,
                                                       boolean doExact, boolean leadingWildcard) {
        // ### Todo: Fetch for ka2.ansprechpartner, traeger name, too
        HashMap<Long, Topic> uniqueResults = new HashMap<Long, Topic>();
        // Refactor prepareLucenQuery...
        // boolean forceExactQuery = (query.contains("?") || doExact);
        String queryString = preparePhraseOrTermLuceneQuery(query);
        log.log(Level.INFO, "> fulltextPlaceQuery=\"{0}\"", queryString);
        if (queryString != null) {
            List<Topic> searchResults = dm4.searchTopics(queryString, "ka2.geo_object.name");
            List<Topic> descrResults = dm4.searchTopics(queryString, "ka2.beschreibung");
            List<Topic> stichworteResults = dm4.searchTopics(queryString, "ka2.stichworte");
            List<Topic> bezirksregionResults = dm4.searchTopics(queryString, "ka2.bezirksregion"); // many
            // List<Topic> streetNameResults = dm4.searchTopics(query, "dm4.contacts.street"); // deeply related  **/
            log.info("> Matched " + searchResults.size() + " (Einrichtungsnamen), "+ descrResults.size() +" (Beschreibungen), "
                + stichworteResults.size() + " (Stichwörtern) , "
                + bezirksregionResults.size() + " (Bezirksregionen) "); /**  + streetNameResults.size()
                    + " (Straßennamen) results for query=\""+queryString+"\""); **/
            // merge all types in search into one results set
            searchResults.addAll(descrResults);
            searchResults.addAll(stichworteResults);
            searchResults.addAll(bezirksregionResults);
            // searchResults.addAll(streetNameResults);
            Iterator<Topic> iterator = searchResults.iterator();
            while (iterator.hasNext()) {
                Topic next = iterator.next();
                if (next.getTypeUri().equals("ka2.bezirksregion")) {
                    List<RelatedTopic> geoObjects = next.getRelatedTopics("dm4.core.aggregation", CHILD_ROLE, PARENT_ROLE,
                        "ka2.geo_object");
                    log.fine("Collecting " + geoObjects.size() + " geo objects associated with \"" + next.getSimpleValue().toString() + "\"");
                    for (RelatedTopic geoObject : geoObjects) {
                        addGeoObjectToResults(uniqueResults, geoObject);
                    }
                } else if (next.getTypeUri().equals("ka2.geo_object.name") || next.getTypeUri().equals("ka2.stichworte")
                    || next.getTypeUri().equals("ka2.beschreibung")) {
                    addGeoObjectToResults(uniqueResults, getParentGeoObjectTopic(next));
                } else if (next.getTypeUri().equals("dm4.contacts.street")) {
                    log.fine("Collecting all geo objects associated with \"" + next.getSimpleValue().toString() + "\"");
                    List<RelatedTopic> addresses = next.getRelatedTopics("dm4.core.aggregation",
                        CHILD_ROLE, PARENT_ROLE, "dm4.contacts.address");
                    for (RelatedTopic address : addresses) {
                        Topic geoObject = getParentGeoObjectTopic(address);
                        addGeoObjectToResults(uniqueResults, geoObject);
                    }
                }
            }
            log.info("searchResultLength=" + (searchResults.size()) + ", " + "uniqueResultLength=" + uniqueResults.size());
        } else {
            log.info("searchFulltextInGeoObjectChilds given queryString is EMPTY - Skipping search");
        }
        return new ArrayList(uniqueResults.values());
    }

    /* ------------------- Geo Object Spatial Search Implementatioon ------------ */

    /**
     * Fetches Geo Objects to be displayed in a map by WGS 84 coordinate pair (Longitude, Latitude)
     * and a numerical radius (provide in km).
     * @param coordinates
     * @param radius
     */
    @GET
    @Path("/search/{coordinatePair}/{radius}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<GeoMapView> searchGeoObjectsNearBy(@HeaderParam("Referer") String referer,
                                                     @PathParam("coordinatePair") String coordinates,
                                                     @PathParam("radius") String radius) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        // 1) Set default search radius for a query
        double r = (radius.isEmpty() || radius.equals("0")) ? 1.0 : Double.parseDouble(radius);
        List<GeoMapView> results = new ArrayList<GeoMapView>();
        // 2) Process spatial search results (=topics of type Geo Coordinate)
        List<Topic> geoObjects = searchGeoObjectsNearby(coordinates, r);
        for (Topic geoTopic : geoObjects) {
            // TODO:C2.1) ### Filer out ang3bote not current anymore...
            results.add(new GeoMapView(geoTopic, geomaps, angebote));
        }
        return results;
    }

    /**
     * Fetches a list of streetname geo coordinates pairs from the kiezatlas database.
     * TODO: Just deliver UNIQUE Streets (by NAME and NR)
     * @param referer
     * @param query
     * */
    @GET
    @Path("/search/coordinates")
    public List<CoordinatesView> searchStreetCoordinatesByName(@HeaderParam("Referer") String referer,
                                                               @QueryParam("query") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            // String queryValue = prepareLuceneQueryString(query, false, false, false, false);
            // log.info("Street Coordinates Query=\""+queryValue+"\"");
            // List<CoordinatesView> results = new ArrayList<CoordinatesView>();
            // if (isInvalidSearchQuery(queryValue)) return results;
            // getKiezatlasStreetCoordinates();
            List<CoordinatesView> googleResults = getGoogleStreetCoordinates(query + ", Berlin, Germany");
            log.info("Fetched " + googleResults.size() + " google street coordinate values");
            return googleResults;
        } catch (Exception e) {
            throw new RuntimeException("Searching street coordinate values by name failed", e);
        }
    }



    // ------------------------------------------- Kiezatlas Website Service and Event Interface Implementation ----- //

    @Override
    public Topic getGeoObjectById(String topicId) {
        Topic geoObject = null;
        try {
            if (topicId.startsWith("t-")) {
                geoObject = dm4.getTopicByUri("de.kiezatlas.topic." + topicId);
            } else {
                String username = accesscl.getUsername();
                boolean readOp = dm4.getAccessControl().hasPermission(accesscl.getUsername(),
                        Operation.READ, Long.parseLong(topicId));
                if (readOp) {
                    geoObject = dm4.getTopic(Long.parseLong(topicId));
                } else {
                    log.warning("Read permission for " + username + " on topicId=" + topicId + ", allowed=" + readOp);
                }
            }
        } catch(RuntimeException e) {
            log.severe("Website module could not load geo object by id=" + topicId + ", " + e.getLocalizedMessage());
        }
        return geoObject;
    }

    @Override
    public void angebotsInfoAssigned(Topic angebotsInfo, Topic geoObject, Association assignmentEdge) {
        log.info("Website listening to \"" + angebotsInfo.getSimpleValue() + "\" being assigned to \""
            + geoObject.getSimpleValue() + "\" as a NEW ANGEBOT");
        // Include Einrichtungs-Inhaberin into Recipients
        Topic contactFacet = getContactFacet(geoObject);
        String eMailAddress = getAnsprechpartnerMailboxValue(contactFacet);
        List<String> mailboxes = getAssignedUserMailboxes(geoObject);
        StringBuilder recipients = new StringBuilder();
        if (eMailAddress != null && !eMailAddress.isEmpty()) {
            log.info("Angebotsinfo Assignment Notification goes to \"" + eMailAddress + "\"");
            if (signup.isValidEmailAddress(eMailAddress)) {
                recipients.append(eMailAddress);
                recipients.append(";");
            } else {
                log.warning("Einrichtung has AnsprechpartnerIn set but \"" + eMailAddress + "\" is NOT A VALID EMAIL");
                recipients.append(SYSTEM_MAINTENANCE_MAILBOX);
            }
        } else if (mailboxes != null && mailboxes.size() > 0) {
            log.info("NO EMAIL value set for Angebotsinfo location, informing responsible username...");
            for (String mailbox : mailboxes) {
                log.info("NO EMAIL value set for Angebotsinfo location, informing responsible username...");
                recipients.append(mailbox);
            }
        } else {
            log.info("NO USER ASSIGNED to Angebots location informing regional administrators"
                + "(and " + SYSTEM_MAINTENANCE_MAILBOX + ")");
            // Informing AnsprechpartnerIn and System Mailbox about missing User Assignment
            recipients.append(buildEditorialNotificationRecipients(geoObject, true, false, true));
            recipients.append(SYSTEM_MAINTENANCE_MAILBOX);
        }
        // Create revision key
        String key = UUID.randomUUID().toString();
        assignmentEdge.setProperty("revision_key", key, false);
        // Create mail message details
        String revisionPage = SignupPlugin.DM4_HOST_URL + "angebote/revise/" + key + "/" + assignmentEdge.getId();
        String message = "Falls dieses Angebot nicht an der Einrichtung <a href=\""
                + DM4_HOST_URL + GEO_OBJECT_RESOURCE + geoObject.getId() + "\">" + geoObject.getSimpleValue().toString()
                + "</a> stattfindet bzw. nicht stattfinden soll, nutzen Sie bitte auf der folgenden Seite die "
                + "<a href=\""+revisionPage+"\">Funktion zur Aufhebung dieser terminlichen Zuordnung</a>.<br/>";
        long startTime = angebote.getAssignmentStartTime(assignmentEdge);
        long endTime = angebote.getAssignmentEndTime(assignmentEdge);
        StringBuilder mailBody = new StringBuilder();
        mailBody.append("<br/><b>" + angebotsInfo.getSimpleValue().toString() + "</b>, "
                + "<a href=\"" + DM4_HOST_URL + ANGEBOTE_RESOURCE + angebotsInfo.getId() + "\">Link</a><br/>");
        String standardBeschreibung = angebotsInfo.getChildTopics().getStringOrNull(ANGEBOT_BESCHREIBUNG);
        if (standardBeschreibung != null) mailBody.append("<br/><em>" + JavaUtils.stripHTML(standardBeschreibung) + "</em>");
        mailBody.append("<br/>F&uuml;r den Zeitraum vom <em>" + df.format(startTime) + " bis zum " + df.format(endTime) + "</em>");
        mailBody.append("<br/><br/>" + message + "<br/><br/>");
        mailBody.append("Vielen Dank!");
        // Send notification
        signup.sendUserMailboxNotification(recipients.toString(), "Angebotsinfos ihrer Kiezatlas-Einrichtung zugewiesen", mailBody.toString());
    }

    @Override
    public void angebotsInfoAssignmentRemoved(Topic angebotsInfo, Topic geoObject, Association assignmentEdge, String username) {
        log.info("Assignment of Angebot \""+angebotsInfo.getSimpleValue()+"\" removed from "
                + "Ansprechpartner_in ("+username+") for \"" + geoObject.getSimpleValue() + "\"");
        try {
            String angebotsName = angebotsInfo.getSimpleValue().toString();
            String einrichtungsName = geoObject.getSimpleValue().toString();
            String subject = "Angebotszeitraum für \"" + angebotsName + "\" am Ort " + einrichtungsName + " entfernt";
            StringBuilder mailBody = new StringBuilder();
            // From
            // String fromMailbox = dm4.getAccessControl().getEmailAddress(username);
            // Recipients
            StringBuilder recipients = new StringBuilder();
            Topic creator = angebote.getAngebotsinfoCreator(angebotsInfo);
            String creatorMailbox = dm4.getAccessControl().getEmailAddress(creator.getSimpleValue().toString());
            recipients.append(creatorMailbox);
            // Message Body
            long startTime = angebote.getAssignmentStartTime(assignmentEdge);
            long endTime = angebote.getAssignmentEndTime(assignmentEdge);
            String zusatzInfo = angebote.getAssignmentZusatzinfo(assignmentEdge);
            String zusatzKontakt = angebote.getAssignmentKontakt(assignmentEdge);
            String standardBeschreibung = angebotsInfo.getChildTopics().getStringOrNull(ANGEBOT_BESCHREIBUNG);
            mailBody.append("Hallo " + creator.getSimpleValue().toString() + ",<br/><br/>");
            mailBody.append("dein \"" + angebotsName + "\" wurde "
                    + "von unserer/m Ansprechpartner_in f&uuml;r den Ort \"" + einrichtungsName + "\" revidiert.<br/><br/>");
            mailBody.append("Diese &Auml;nderung betrifft nur den Angebotszeitraum vom <em>"
                    + df.format(startTime) + " bis zum " + df.format(endTime) + "</em> an diesem Veranstaltungsort.");
            mailBody.append("<br/>Name des Angebots: " + angebotsName);
            if (standardBeschreibung != null) {
                mailBody.append("<br/>Beschreibung: " + JavaUtils.stripHTML(standardBeschreibung));
            }
            if (zusatzInfo != null) {
                mailBody.append("<br/>Zusatzinfo zu diesem Angebotszeitraum war: " + JavaUtils.stripHTML(zusatzInfo));
            }
            if (zusatzKontakt != null) {
                mailBody.append("<br/>Kontaktinfo f&uuml;r diesen Angebotszeitraum war: " + JavaUtils.stripHTML(zusatzKontakt));
            }
            mailBody.append("<br/><br/>");
            mailBody.append("Vielen Dank f&uuml;r Ihr Verst&auml;ndnis und falls noch nicht geschehen, bitte stimmen Sie einen "
                    + "neuen Angebotszeitraum mit dem Veranstaltungsort im Vorfeld ab.");
            signup.sendUserMailboxNotification(recipients.toString(), subject, mailBody.toString());
        } catch (Exception e) {
            log.warning("Notification could not be sent due to " +  e.getLocalizedMessage() + ", caused by " + e.getCause());
        }
    }

    @Override
    public void contactAngebotsAnbieter(Topic angebotsInfo, Topic geoObject, Association assignmentEdge,
            String message, String usernameFrom, String usernameTo) {
        log.info("Contact creator ("+usernameTo+") of \""+angebotsInfo.getSimpleValue()+"\" on behalf of  "
                + "Ansprechpartner_in ("+usernameFrom+") for \"" + geoObject.getSimpleValue() + "\"");
        try {
            String angebotsName = angebotsInfo.getSimpleValue().toString();
            String einrichtungsName = geoObject.getSimpleValue().toString();
            String subject = "Rückfrage zur Angebotsinfo \"" + angebotsName.trim() + "\", Ort: " + einrichtungsName.trim();
            // From
            String fromMailbox = dm4.getAccessControl().getEmailAddress(usernameFrom);
            StringBuilder mailBody = new StringBuilder();
            // Recipients
            StringBuilder recipients = new StringBuilder();
            Topic creator = angebote.getAngebotsinfoCreator(angebotsInfo);
            String creatorMailbox = dm4.getAccessControl().getEmailAddress(creator.getSimpleValue().toString());
            recipients.append(creatorMailbox);
            // Message Body
            long startTime = angebote.getAssignmentStartTime(assignmentEdge);
            long endTime = angebote.getAssignmentEndTime(assignmentEdge);
            String standardBeschreibung = angebotsInfo.getChildTopics().getStringOrNull(ANGEBOT_BESCHREIBUNG);
            String zusatzInfo = angebote.getAssignmentZusatzinfo(assignmentEdge);
            String zusatzKontakt = angebote.getAssignmentKontakt(assignmentEdge);
            mailBody.append("Hallo " + usernameTo + ",<br/><br/>");
            String messageValue = JavaUtils.stripHTML(message).replaceAll("\\n", "<br/>");
            mailBody.append(messageValue);
            mailBody.append("<br/><br/>");
            mailBody.append("Die Anfrage bezieht sich auf den Angebotszeitraum vom <em>"
                    + df.format(startTime) + " bis zum " + df.format(endTime) + "</em> ");
            mailBody.append("und die Angebotsinfos <a href=\"" + DM4_HOST_URL + ANGEBOTE_RESOURCE + angebotsInfo.getId()
                    + "\">"+angebotsName+"</a>:<br/>");
            if (standardBeschreibung != null) {
                mailBody.append("<br/>Beschreibung: " + JavaUtils.stripHTML(standardBeschreibung));
            }
            if (zusatzInfo != null) {
                mailBody.append("<br/>Zusatzinfo zu diesem Angebotszeitraum: " + JavaUtils.stripHTML(zusatzInfo));
            }
            if (zusatzKontakt != null) {
                mailBody.append("<br/>Kontakt f&uuml;r diesen Angebotszeitraum ist: " + JavaUtils.stripHTML(zusatzKontakt));
            }
            // Keep sender private
            // mailBody.append("<br/><br/>Ihre Antwort schicken Sie bitte an <a href=\"mailto:"+fromMailbox+"\">" + fromMailbox + "</a><br/>");
            signup.sendUserMailboxNotification(recipients.toString(), subject, mailBody.toString());
        } catch (Exception e) {
            log.warning("Anbieter could not be contacted due to " +  e.getLocalizedMessage() + ", caused by " + e.getCause());
        }
    }

    @PUT
    @Path("/image/facet/delete/{geoObjectId}/{fileTopicId}")
    @Transactional
    public String updateImagePathFacet(@HeaderParam("Referer") String referer,
            @PathParam("geoObjectId") long geoObjectId, @PathParam("fileTopicId") long fileTopicId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        JSONObject result = new JSONObject();
        Topic geoObject = dm4.getTopic(geoObjectId);
        // clear bild assignment association
        RelatedTopic bildFileTopic = geoObject.getRelatedTopic(BILD_ASSIGNMENT,
                DEFAULT_ROLE, DEFAULT_ROLE, "dm4.files.file");
        if (bildFileTopic != null && bildFileTopic.getId() == fileTopicId) {
            bildFileTopic.getRelatingAssociation().delete();
            log.info("Deleted Bild Facet Value Reference: " + bildFileTopic.toString());
        } else {
            log.info("Could not delete Bild Facet Value for given fileTopicId: " + bildFileTopic);
        }
        return result.toString();
    }

    @GET
    @Path("/geocode")
    public String geoCodeAddressInput(@HeaderParam("Referer") String referer, @QueryParam("query") String input) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        return geoCodeAddressInput(input);
    }

    @GET
    @Path("/reverse-geocode/{latlng}")
    public String geoCodeLocationInput(@HeaderParam("Referer") String referer, @PathParam("latlng") String latlng) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        return geoCodeLocationInput(latlng);
    }

    @GET
    @Path("/newsfeed/{siteItemId}")
    public List<NewsFeedItem> fetchSiteNewsfeedContent(@HeaderParam("Referer") String referer,
            @PathParam("siteItemId") long siteItemId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        List<NewsFeedItem> newsItems = new ArrayList<NewsFeedItem>();
        try {
            Topic siteItem = dm4.getTopic(siteItemId);
            URL rssFeedUrl = null;
            if (siteItem.getTypeUri().equals("ka2.bezirk")) {
                BezirkView infoTopic = new BezirkView(siteItem);
                if (infoTopic.getSiteRSSFeedURL() == null) return null;
                rssFeedUrl = new URL(infoTopic.getSiteRSSFeedURL().getSimpleValue().toString());
            } else if (siteItem.getTypeUri().equals("ka2.website")) {
                CitymapView infoTopic = new CitymapView(siteItem);
                if (infoTopic.getSiteRSSFeedURL() == null) return null;
                rssFeedUrl = new URL(infoTopic.getSiteRSSFeedURL());
            }
            NewsFeedClient newsClient = new NewsFeedClient(rssFeedUrl);
            return newsClient.fetchSiteRSSFeed();
        } catch (Exception ex) {
            log.warning("Site XML Feed could either not be parsed or loaded, please try again: "
                + ex.getMessage() + " caused By: " + ex.getCause().getMessage());
            return newsItems;
        }
    }

    // ------------------------------------------ Kiezatlas Website Page/Template Preparation Helpers --------------- //

    private void prepareSearchTemplateParameter(String search, long contextId,
            String method, String type, String nearby) {
        viewData("search", (search == null) ? "" : search);
        viewData("searchContext", (contextId <= 0) ? 0 : contextId);
        viewData("searchMethod", (method == null) ? "quick" : method);
        viewData("searchNearby", (nearby == null) ? "undefined" : nearby);
        viewData("searchType", (type == null) ? "place" : type);
        viewData("tags", angebote.getActiveAngeboteTags());
    }

    private void initializeCityMapWebAliasResources() {
        webpages.setFrontpageAliases(loadCitymapSiteAliases());
        webpages.reinitTemplateEngine();
    }

    /**
     * Prepares the most basic data used across all our Thymeleaf page templates.
     * @param website
     */
    private void prepareCityMapSite(Topic website) {
        if (website != null) {
            Website site = new Website(website, dm4);
            viewData("siteName", site.getName());
            viewData("siteCaption", site.getCaption());
            viewData("siteAbout", site.getAboutHTML());
            viewData("siteId", website.getId());
            viewData("footerText", site.getFooter());
            viewData("customSiteCss", site.getStylesheetPath());
            viewData("menuItems", site.getActiveMenuItems());
            List<Webpage> pages = webpages.getPublishedWebpages(website);
            // sort webpages on websites frontpage by modification time
            viewData("webpages", webpages.getWebpagesSortedByTimestamp(pages, true)); // false=creationDate
        } else {
            log.warning("Preparing webpage template failed because the website was not given");
        }
    }

    private void prepareEditorListing() {
        // Optimize: Loads district topic twice (see earlier calls to isAssociatedDistrictMember())
        List<RelatedTopic> districts = getUserDistrictTopics();
        List<RelatedTopic> regions = getUserSubregionTopics();
        districts.addAll(regions);
        viewData("userDistricts", districts);
        // viewData("availableLor", getAvailableLORNumberTopics());
        viewData("workspace", getStandardWorkspace());
    }

    private Viewable prepareGeoObjectTemplate(@PathParam("topicId") long topicId) {
        // ### redirect if user has no READ permission on this topic
        Topic username = getUsernameTopic();
        Topic geoObject = dm4.getTopic(topicId);
        if (!isGeoObjectTopic(geoObject)) return getNotFoundPage();
        // Assemble Generic Einrichtungs Infos
        EinrichtungView einrichtung = assembleEinrichtungsDetails(geoObject);
        // ### Yet Missing: Träger und Stichworte
        // Eventually show: Bezirk, Bezirksregion and Sonstiges (Administrator Infos)
        viewData("geoobject", einrichtung);
        // Assemble Category Assignments for Einrichtung;
        viewData("zielgruppen", facets.getFacets(geoObject, ZIELGRUPPE_FACET));
        viewData("themen", facets.getFacets(geoObject, THEMA_FACET));
        viewData("angebote", facets.getFacets(geoObject, ANGEBOT_FACET));
        // fetch related angebote, includeFutureOnes=true
        List<AngebotsinfosAssigned> angebotsInfos = angebote.getActiveAngebotsinfosAssigned(geoObject, true);
        if (angebotsInfos.size() > 0) viewData("angebotsinfos", angebotsInfos);
        // user auth
        preparePageTemplate("detail");
        // Json-LD
        viewData("placeMarkup", einrichtung.toJSONLD());
        // geo object auth
        viewData("is_trashed", isTopicInDeletionWorkspace(geoObject));
        viewData("is_published", isTopicInStandardWorkspace(geoObject));
        viewData("editable", isGeoObjectEditable(geoObject, username));
        // ### is viewData("deletable", hasUserWritePermission(geoObject, username));
        viewData("deletable", isDeletionWorkspaceMember());
        viewData("workspace", getAssignedWorkspace(geoObject));
        return view("website-detail");
    }

    private Viewable prepareBezirksregionenTemplate(List<BezirksregionView> results) {
        // Optimize: Loads district topic twice (see earlier calls to isAssociatedDistrictMember())
        viewData("userDistricts", getUserDistrictTopics());
        preparePageTemplate("editors");
        viewData("geoobjects", results);
        viewData("geoobjectsCount", results.size());
        // prepareGeoObjectListing(results);
        viewData("regions", results);
        return view("list-editors");
    }

    private Viewable preparePublicFilterList(long districtId) {
        List<EinrichtungView> results = getEinrichtungList(districtId);
        viewData("districtId", districtId);
        viewData("name", "Einrichtungen");
        return getFilterListTemplate(results);
    }

    private Viewable getWebsiteMap() {
        preparePageTemplate("frontpage");
        return view("website-front");
    }

    private Viewable getFrontpage() {
        preparePageTemplate("frontpage");
        return view("website-grid");
    }

    private Viewable getFilterListTemplate(List<EinrichtungView> results) {
        preparePageTemplate("list-filter");
        prepareEditorListing();
        viewData("geoobjects", results);
        viewData("geoobjectsCount", results.size());
        log.info("Completed preparation of filter LIST with " + results.size() + " entries");
        return view("list-filter");
    }

    private Viewable getListTemplate(List<EinrichtungView> results) {
        preparePageTemplate("list");
        prepareEditorListing();
        viewData("geoobjects", results);
        viewData("geoobjectsCount", results.size());
        log.info("Completed preparation of LIST with " + results.size() + " entries");
        return view("list");
    }

    private Viewable getConfirmationBezirkTemplate(List<EinrichtungView> results) {
        preparePageTemplate("confirmation");
        prepareEditorListing();
        viewData("viewtype", "bezirk");
        viewData("geoobjects", results);
        viewData("geoobjectsCount", results.size());
        return view("list-confirms");
    }

    private Viewable getConfirmationBezirksregionTemplate(List<BezirksregionView> results) {
        preparePageTemplate("confirmation");
        prepareEditorListing();
        viewData("viewtype", "bezirksregion");
        viewData("bezirksregionen", results);
        viewData("bezirksregionenCount", results.size());
        return view("list-confirms");
    }

    private Viewable getAssignmentTemplate() {
        preparePageTemplate("assignments");
        viewData("name", "AnsprechpartnerInnen");
        return view("list-user-assignments");
    }

    private Viewable getCommentsTemplate(List<EinrichtungView> results) {
        preparePageTemplate("comments");
        prepareEditorListing();
        viewData("geoobjects", results);
        viewData("geoobjectsCount", results.size());
        return view("list-comments");
    }

    private Viewable getSimpleMessagePage() {
        preparePageTemplate("page");
        return view("message");
    }

    private Viewable getNotFoundPage() {
        return getNotFoundPage(null, null);
    }

    private Viewable getNotFoundPage(String message) {
        return getNotFoundPage(message, null);
    }

    private Viewable getNotFoundPage(String message, String backLinkUrl) {
        if (message != null) viewData("message", message);
        if (backLinkUrl != null) viewData("originated", backLinkUrl);
        preparePageTemplate("page");
        return view("404");
    }

    private Viewable getUnauthorizedPage() {
        return getUnauthorizedPage(null, null);
    }

    private Viewable getUnauthorizedPage(String message) {
        return getUnauthorizedPage(message, null);
    }

    private Viewable getUnauthorizedPage(String message, String backLinkUrl) {
        preparePageTemplate("page");
        if (message != null) viewData("message", message);
        if (backLinkUrl != null) viewData("originated", backLinkUrl);
        return view("401");
    }

    private void populateGeoObjectFormTemplate() {
        viewData("availableCities", getAvailableCityTopics());
        viewData("availableDistricts", getAvailableDistrictTopics());
        viewData("availableCountries", getAvailableCountryTopics());
        viewData("availableThemen", getThemaCriteriaTopics());
        viewData("availableTraeger", getAvailableTraegerTopics());
        // viewData("availableLor", getAvailableLORNumberTopics());
        viewData("availableAngebote", getAngebotCriteriaTopics());
        viewData("availableZielgruppen", getZielgruppeCriteriaTopics());
    }

    private void preparePageTemplate(String templateName) {
        preparePageTemplate(templateName, null);
    }

    private void preparePageTemplate(String templateName, String href) {
        boolean isAuthenticated = isAuthenticated();
        boolean isConfirmationMember = isConfirmationWorkspaceMember();
        boolean isSiteManager = isSiteEditor();
        List<Topic> districts = getAvailableDistrictTopics();
        viewData("districts", districts);
        viewData("authenticated", isAuthenticated);
        viewData("is_publisher", isConfirmationMember);
        viewData("is_district_admin", (getUserDistrictTopics() != null));
        viewData("is_site_manager", isSiteManager);
        viewData("template", templateName);
        viewData("location", (href == null) ? "" : href);
        Topic standardwebsite = webpages.getStandardWebsite();
        viewData("website", "standard");
        prepareFooterMenuItems();
        prepareCityMapSite(standardwebsite);
        log.fine("Checked Authorization (isConfirmationMember=" + isConfirmationMember
            + ", isSiteManager="+isSiteManager+", isAuthenticated=" + isAuthenticated + ")");
    }

    // --------------------------- Thymeleaf Template Accessor and Private Helper Methods --------------------------- //

    private List<RelatedTopic> getUnconfirmedEinrichtungTopics() {
        Topic confirmationWs = getConfirmationWorkspace();
        return confirmationWs.getRelatedTopics("dm4.core.aggregation",
                CHILD_ROLE,PARENT_ROLE, KiezatlasService.GEO_OBJECT);
    }

    private List<EinrichtungView> getEinrichtungList(long districtId) {
        List<EinrichtungView> results = new ArrayList<EinrichtungView>();
        Topic district = dm4.getTopic(districtId);
        List<RelatedTopic> geoObjects = district.getRelatedTopics("dm4.core.aggregation",
            CHILD_ROLE, PARENT_ROLE, KiezatlasService.GEO_OBJECT);
        sortByModificationDateDescending(geoObjects);
        for (RelatedTopic geoObject : geoObjects) {
            EinrichtungView object = assembleEinrichtungListElement(geoObject, false);
            if (object != null) results.add(object);
        }
        return results;
    }

    private List<EinrichtungView> getCommentedEinrichtungList(long districtId) {
        List<EinrichtungView> results = new ArrayList<EinrichtungView>();
        List<EinrichtungView> all = getCommentedEinrichtungList();
        for (EinrichtungView ein : all) {
            if (ein.getBezirkId() == districtId) {
                results.add(ein);
            }
        }
        return results;
    }

    private List<EinrichtungView> getCommentedEinrichtungList() {
        List<EinrichtungView> results = new ArrayList();
        List<Topic> allComments = dm4.getTopicsByType("ka2.comment");
        for (Topic comment : allComments) {
            List<RelatedTopic> geoObjects = comment.getRelatedTopics("ka2.comment.assignment");
            log.info("LOADED " + geoObjects.size() + " associated with BEARBEITUNGSHINWEISE");
            if (geoObjects.size() > 0) {
                for (RelatedTopic geoObject : geoObjects) {
                    EinrichtungView einrichtung = assembleEinrichtungsDetails(geoObject);
                    if (!results.contains(einrichtung)) {
                        results.add(einrichtung);
                    }
                }
            } else {
                log.info("Comment: " + comment.toString() + ", relatedTopics: " + comment
                    .getRelatedTopics("ka2.comment.assignment"));
            }
        }
        return results;
    }

    private List<EinrichtungView> getUnconfirmedEinrichtungenInBezirk(Topic district) {
        List<EinrichtungView> results = new ArrayList();
        List<RelatedTopic> unconfirmedGeoObjects = getUnconfirmedEinrichtungTopics();
        List<RelatedTopic> sortedGeoObjects = unconfirmedGeoObjects;
        sortByModificationDateDescending(sortedGeoObjects);
        for (RelatedTopic geoObject : sortedGeoObjects) {
            EinrichtungView einrichtung = assembleEinrichtungListElement(geoObject, false);
            if (einrichtung != null) {
                einrichtung.setAssignedUsername(getAssignedUsernameOne(geoObject));
                if (einrichtung.getBezirkId() == district.getId()) {
                    results.add(einrichtung);
                }
            }
        }
        return results;
    }

    private List<RelatedTopic> getUnconfirmedGeoObjectsInBezirksregion(Topic bezirksregionName) {
        List<RelatedTopic> results = new ArrayList();
        List<RelatedTopic> unconfirmedGeoObjects = getUnconfirmedEinrichtungTopics();
        List<RelatedTopic> sortedGeoObjects = unconfirmedGeoObjects;
        sortByModificationDateDescending(sortedGeoObjects);
        for (RelatedTopic geoObject : sortedGeoObjects) {
            if (getBezirksregionFacet(geoObject).getId() == bezirksregionName.getId()) {
                results.add(geoObject);
            }
        }
        return results;
    }

    /** -------------------- Permission, Workspace and Membership Related Helpers ----------------------- **/

    private boolean hasWorkspaceAssignment(DeepaMehtaObject object) {
        return (dm4.getAccessControl().getAssignedWorkspaceId(object.getId()) > NEW_TOPIC_ID);
    }

    private boolean isInReview(DeepaMehtaObject object) {
        return (dm4.getAccessControl().getAssignedWorkspaceId(object.getId()) == getConfirmationWorkspace().getId());
    }

    private boolean isPendingForDeletion(DeepaMehtaObject object) {
        return (dm4.getAccessControl().getAssignedWorkspaceId(object.getId()) == getDeletionWorkspace().getId());
    }

    private void privilegedAssignToWorkspace(DeepaMehtaObject object, long workspaceId) {
        if (object != null) {
            if (!hasWorkspaceAssignment(object)) {
                dm4.getAccessControl().assignToWorkspace(object, workspaceId);
            } else {
                long wsId = dm4.getAccessControl().getAssignedWorkspaceId(object.getId());
                log.info("Skipping privileged workspace assignment, "
                    + object.toString() + " already has a workspace assignment to \"" + wsId+ "\"");
            }
        }
    }

    private boolean isUserAssociatedWithBezirk(long districtId) {
        return isUserAssociatedWithBezirk(districtId, null);
    }

    private boolean isUserAssociatedWithBezirksregion(long bezirksregionId) {
        return isUserAssociatedWithBezirksregion(bezirksregionId, null);
    }

    private boolean isUserAssociatedWithBezirk(long districtId, Topic username) {
        if (districtId == -1) return false;
        List<RelatedTopic> districts = (username == null) ? getUserDistrictTopics() : getUserDistrictTopics(username);
        for (RelatedTopic district : districts) {
            if (district.getId() == districtId) {
                return true;
            }
        }
        return false;
    }

    private boolean isUserAssociatedWithBezirksregion(long bezirksregionId, Topic username) {
        if (bezirksregionId == -1) return false;
        List<RelatedTopic> regions = (username == null) ? getUserSubregionTopics() : getUserSubregionTopics(username);
        for (RelatedTopic region : regions) {
            if (region.getId() == bezirksregionId) {
                return true;
            }
        }
        return false;
    }

    private boolean isConfirmationWorkspaceMember() {
        return isConfirmationWorkspaceMember(null);
    }

    private boolean isConfirmationWorkspaceMember(Topic usernameTopic) {
        String username = "";
        if (usernameTopic == null) {
            username = accesscl.getUsername();
        } else {
            username = usernameTopic.getSimpleValue().toString();
        }
        if (username != null) {
            Topic workspace = getConfirmationWorkspace();
            boolean wsMember = (accesscl.isMember(username, workspace.getId())
                                || accesscl.getWorkspaceOwner(workspace.getId()).equals(username));
            log.fine("Permissions Check, isConfirmationWorkspaceMember=" + wsMember);
            return wsMember;
        } else {
            return false;
        }
    }

    /** private boolean isAuthorizedSuperEditor() {
        return (isAuthenticated() && ); // # DM Workspace Membership
    } **/

    private boolean isCommentEditor() {
        return (isAuthenticated() && comments.isCommentsWorkspaceMember());
    }

    private boolean isCommentEditor(String username) {
        return (isAuthenticated() && comments.isCommentsWorkspaceMember(username));
    }

    private boolean isSiteEditor() {
        return (isAuthenticated() && kiezatlas.isKiezatlasWorkspaceMember());
    }

    private boolean isSiteEditor(Topic username) {
        return kiezatlas.isKiezatlasWorkspaceMember(username);
    }

    private boolean isAuthenticated() {
        return (accesscl.getUsername() != null);
    }

    private boolean isValidReferer(String ref) {
        if (ref == null) return false;
        if (ref.contains(".kiezatlas.de/") || ref.contains("localhost:8080")
            || ref.contains("localhost:8182") || ref.contains("kiezatlas.berlin")) {
            return true;
        } else {
            log.warning("Invalid Request Referer \"" + ref + "\"");
            return false;
        }
    }

    private boolean isGeoObjectTopic(Topic geoObject) {
        // ### Checking for typeuri AND Confirmed flagmay be redundant
        return geoObject != null && geoObject.getTypeUri().equals(KiezatlasService.GEO_OBJECT);
    }

    private boolean isKiezatlas1Entry(Topic geoObject) {
        return geoObject.getUri().startsWith(KA1_GEO_OBJECT_URI_PREFIX);
    }

    private boolean isAggregatingChildTopic(Topic geoObject, long topicId) {
        return (geoObject != null && topicId > 0) && geoObject.getAssociation("dm4.core.aggregation", PARENT_ROLE,
            CHILD_ROLE, topicId) != null;
    }

    private boolean isGeoObjectEditable(Topic geoObject, Topic username) {
        if (username == null) return false;
        String usernameValue = username.getSimpleValue().toString();
        if (isTopicAssignedToUsername(geoObject, usernameValue)) { // && !isKiezatlas1GeoObject(geoObject)) {
            log.info("Edit Permission GRANTED for user=" + usernameValue + " being the geo object's editor");
            return true;
        }
        if (isConfirmationWorkspaceMember(username)) {
            Topic district = getRelatedBezirk(geoObject);
            Topic region = getRelatedBezirksregion(geoObject);
            // Level 1 Permission: District Level
            if (isUserAssociatedWithBezirk(district.getId())) {
                log.info("Edit Permission GRANTED for \"" + usernameValue + "\" being a confirmation-ws member");
                return true;
            }
            // Level 2 Permission: Region Level
            if (isUserAssociatedWithBezirksregion(region.getId())) {
                log.info("Edit Permissions GRANTED on Geo Object by Bezirksregion " + region.getSimpleValue()
                    + ") for \"" + usernameValue + "\" being an assigned member");
                return true;
            }
        }
        if (hasUserWritePermission(geoObject, username)) return true;
        log.info("Edit Permission DENIED for user \"" + usernameValue + "\". No permission or assignment detected.");
        return false;
    }

    private boolean hasUserWritePermission(Topic geoObject, Topic username) {
        if (username == null) return false;
        String usernameValue = username.getSimpleValue().toString();
        Topic workspace = getAssignedWorkspace(geoObject);
        if (workspace == null) {
            log.warning("Geo Object \""+geoObject.getSimpleValue().toString()+"\" has NO WORKSPACE ASSIGNMENT");
            return false;
        }
        boolean hasWritePermission = dm4.getAccessControl().hasWritePermission(usernameValue, workspace.getId());
        String logMessage = (hasWritePermission) ? "GRANTED" : "DENIED";
        log.info("Write Permission " + logMessage + " for \"" + usernameValue + "\" - in \"" + workspace.getSimpleValue() + "\"");
        return hasWritePermission;
    }

    private boolean isDeletionWorkspaceMember() {
        String username = accesscl.getUsername();
        boolean wsMember = false;
        if (username != null) {
            Topic deletionWs = workspaces.getWorkspace(DELETION_WORKSPACE_URI);
            wsMember = (accesscl.isMember(username, deletionWs.getId())
                || accesscl.getWorkspaceOwner(deletionWs.getId()).equals(username));
        }
        return wsMember;
    }

    private boolean isTopicInDeletionWorkspace(Topic topic) {
        Topic workspace = workspaces.getAssignedWorkspace(topic.getId());
        return (workspace.getUri().equals(DELETION_WORKSPACE_URI));
    }
    private boolean isTopicInStandardWorkspace(Topic topic) {
        Topic workspace = workspaces.getAssignedWorkspace(topic.getId());
        return (workspace.getUri().equals(WorkspacesService.DEEPAMEHTA_WORKSPACE_URI));
    }

    /** private boolean isKiezatlas1GeoObject(Topic geoObject) {
        return (geoObject.getUri().startsWith(KA1_GEO_OBJECT_URI_PREFIX));
    } */

    private boolean isTopicAssignedToUsername(Topic topic, String username) {
        if (username == null) return false;
        List<RelatedTopic> assignments = getAssignedUsernames(topic);
        for (RelatedTopic assignedUsername : assignments) {
            if (assignedUsername.getSimpleValue().toString().equals(username)) return true;
        }
        return false;
    }

    private List<RelatedTopic> getAssignedUsernames(Topic topic) {
        return topic.getRelatedTopics(USER_ASSIGNMENT, DEFAULT_ROLE, DEFAULT_ROLE, "dm4.accesscontrol.username");
    }

    private String getAssignedUsernameOne(Topic geoObject) {
        List<RelatedTopic> assignments = getAssignedUsernames(geoObject);
        for (RelatedTopic assignedUsername : assignments) {
            return assignedUsername.getSimpleValue().toString();
        }
        return null;
    }

    /** ------------------- Kiezatlas Application Model Related Helper Methods -------------------------- **/

    /** private List<CoordinatesView> getKiezatlasStreetCoordinates(String queryPhrase) {
        List<CoordinatesView> results = new ArrayList<CoordinatesView>();
        List<Topic> singleTopics = dm4.searchTopics(queryPhrase, "dm4.contacts.street");
        for (Topic streetname : singleTopics) {
            List<RelatedTopic> addresses = streetname.getRelatedTopics("dm4.core.aggregation",
                CHILD_ROLE, PARENT_ROLE, "dm4.contacts.address");
            for (RelatedTopic address : addresses) {
                GeoCoordinate coordinates = geomaps.getGeoCoordinate(address);
                if (coordinates != null) {
                    CoordinatesView resultItem = new CoordinatesView();
                    resultItem.setName(streetname.getSimpleValue().toString());
                    resultItem.setCoordinates(coordinates);
                    results.add(resultItem);
                }
            }
        }
        log.info("Fetched " + results.size() + " internal street coordinate values");
        return results;
    } **/

    private HashMap<String, String[]> loadCitymapSiteAliases() {
        HashMap<String, String[]> aliases = new HashMap();
        try {
            List<Topic> websiteAliases = dm4.getTopicsByType("ka2.website.web_alias");
            for (Topic alias : websiteAliases) {
                Topic websiteParent = alias.getRelatedTopic("dm4.core.composition", CHILD_ROLE,
                    PARENT_ROLE, "ka2.website");
                String pageName = (websiteParent == null) ? "Stadtplan" : websiteParent.getSimpleValue().toString();
                String templateName = "citymap"; // ### Thymeleaf Template File Name for all Kiezatlas Website topics
                String[] templateValue = { templateName, pageName };
                aliases.put(alias.getSimpleValue().toString(), templateValue);
            }
            log.info("Fetched all ("+aliases.size()+") kiezatlas website aliases");
        } catch (Exception re) {
            log.warning("The migration7 of Kiezatlas Website Module Web Alias "
                    + "has probably not yet finished installation, therefore the "
                    + "topic type Web Alias is not yet known. "
                    + "Skipping loading of all citymap web alias; Cause message: " + re.getCause().getMessage());
        }
        return aliases;
    }

    private String getAnsprechpartnerMailboxValue(Topic kontaktTopic) {
        if (kontaktTopic != null) {
            kontaktTopic.loadChildTopics();
            Topic eMail = kontaktTopic.getChildTopics().getTopic("ka2.kontakt.email");
            if (eMail != null && !eMail.getSimpleValue().toString().isEmpty()) {
                return eMail.getSimpleValue().toString();
            }
        }
        return null;
    }

    private EinrichtungView assembleEinrichtungListElement(Topic geoObject, boolean includeComments) {
        if (geoObject == null) return null;
        EinrichtungView listItem = new EinrichtungView();
        try {
            listItem.setName(geoObject.getChildTopics().getString(GEO_OBJECT_NAME));
        } catch (Exception ex) {
            log.warning("Identified geo object \""+geoObject.getId()+"\" has no Geo Object Name child topic set"
                + "- Skip adding geo object to list, caused by " + ex.getMessage());
            return null;
        }
        listItem.setUri(geoObject.getUri());
        listItem.setId(geoObject.getId());
        // Anschrift
        RelatedTopic address = null;
        try {
            address = geoObject.getChildTopics().getTopic(GEO_OBJECT_ADDRESS);
            listItem.setAddress(address);
        } catch (Exception e) {
            log.warning("Identified geo object \"" + geoObject.getId() + "\" has no Address child topic set -"
                + "Skip adding geo object to list, caused by " + e.getMessage());
            return null;
        }
        // Kontakt
        Topic contactTopic = getContactFacet(geoObject);
        String contactValue = "k.A.";
        if (contactTopic != null) {
            Topic eMail = contactTopic.getChildTopics().getTopic(KONTAKT_MAIL);
            if (eMail != null && !eMail.getSimpleValue().toString().isEmpty()) {
                contactValue = eMail.getSimpleValue().toString();
                listItem.setEmail(eMail.getSimpleValue().toString());
            } else {
                listItem.addClassName("no-email");
                Topic phone = contactTopic.getChildTopics().getTopic(KONTAKT_TEL);
                if (phone != null && !phone.getSimpleValue().toString().isEmpty()) {
                    contactValue = phone.getSimpleValue().toString();
                    listItem.setTelefon(phone.getSimpleValue().toString());
                }
            }
        }
        listItem.setContact(contactValue);
        // Gather assigned users as Ansprechpartner
        List<UsernameView> usernames = assembleUsernameViews(geoObject.getRelatedTopics(USER_ASSIGNMENT));
        listItem.setAssignedUsernames(usernames);
        // Geo Coordinates
        GeoCoordinate coordinates = geomaps.getGeoCoordinate(address);
        if (coordinates != null) {
            listItem.setCoordinates(coordinates);
            /** if (!geospatial.validWGS84Coordinates(coordinates)) { // Check if geo-coordinates are valid
                log.warning("Detected Invalid WGS 84 coordinates: " + coordinates + ", at" + geoObject.getSimpleValue().toString());
                listItem.addClassName("invalid-coordinates");
            } **/
        } else {
            listItem.addClassName("no-coordinates");
        }
        // Angebote count
        List<RelatedTopic> offers = angebote.getAngeboteTopicsByGeoObject(geoObject);
        if (offers.size() > 1) {
            listItem.setAngeboteCount(offers.size());
        }
        // Kategorien
        List<RelatedTopic> cat = getAllCategories(geoObject);
        listItem.setCategories(cat);
        // Unconfirmed Check
        if (isInReview(geoObject)) listItem.addClassName("unconfirmed");
        // Bezirksregionen Check
        Topic bezirksregion = getBezirksregionFacet(geoObject);
        if (bezirksregion != null) {
            listItem.setBezirksregionName(bezirksregion.getSimpleValue().toString());
        } else {
            listItem.addClassName("no-bezirksregion");
        }
        // Bezirk
        Topic bezirk = getRelatedBezirk(geoObject);
        if (bezirk != null) {
            listItem.setBezirkId(bezirk.getId());
        } else {
            listItem.addClassName("no-district");
        }
        if (!listItem.getClassName().equals("")) {
            log.fine("> Identified geo object \"" + geoObject.getId() + "\" misses some facets \"" + listItem.getClassName() + "\"");
        }
        // Assigned Username
        listItem.setCreator(accesscl.getCreator(geoObject.getId()));
        // Currently residing in "Trashed" workspace
        if (isPendingForDeletion(geoObject)) {
            listItem.addClassName("in-trash");
        }
        // Timestamps
        listItem.setCreated(time.getCreationTime(geoObject.getId()));
        listItem.setLastModified(time.getModificationTime(geoObject.getId()));
        if (includeComments) { // Collect Comments
            List<RelatedTopic> commentTopics = comments.getComments(geoObject.getId());
            if (commentTopics != null) {
                listItem.setComments(assembleCommentViews(commentTopics));
            }
        }
        return listItem;
    }

    private EinrichtungView assembleEinrichtungsDetails(Topic geoObject) {
        EinrichtungView detail = new EinrichtungView();
        try {
            geoObject.loadChildTopics();
            detail.setName(geoObject.getChildTopics().getString(KiezatlasService.GEO_OBJECT_NAME));
            // Sets Street, Postal Code, City and Address
            Topic addressTopic = geoObject.getChildTopics().getTopic(KiezatlasService.GEO_OBJECT_ADDRESS);
            if (addressTopic != null) {
                detail.setAddress(addressTopic);
            }
            // Sets Latitude and Longitude
            GeoCoordinate geoCoordinate = geomaps.getGeoCoordinate(addressTopic);
            if (geoCoordinate == null) {
                log.severe("\""+geoObject.getSimpleValue()+"\" has NO GEO COORDINATES set");
                // Continuing to allow frontend and users to correct the missing data manually.
                // ### Double check input form(uses JavaScript) and backend for validating geo coordinates.
            } else {
                detail.setCoordinates(geoCoordinate);
                // Note: Base on coordinates we enrich einrichtungs infos about "LOR ID" and "Bezirksregion Nme" on-the-fly
                enrichWithBezirksregionAndLOR(geoObject, geoCoordinate, detail);
            }
            // Sets Kontakt Facet
            Topic kontakt = getContactFacet(geoObject);
            if (kontakt != null) {
                kontakt.loadChildTopics();
                detail.setEmail(kontakt.getChildTopics().getString(KONTAKT_MAIL));
                detail.setFax(kontakt.getChildTopics().getString(KONTAKT_FAX));
                detail.setTelefon(kontakt.getChildTopics().getString(KONTAKT_TEL));
                detail.setAnsprechpartner(kontakt.getChildTopics().getString(KONTAKT_ANSPRECHPARTNER));
            }
            // Calculates Imprint Value
            Topic bezirk = getRelatedBezirk(geoObject);
            if (bezirk == null) {
                log.warning("Geo Object has NO SPECIFIC IMPRINT (" + geoObject.getId() + ")");
                detail.setImprintUrl(FALLBACK_IMPRINT);
            } else {
                detail.setBezirk(bezirk.getSimpleValue().toString());
                detail.setBezirkId(bezirk.getId());
                BezirkView bezirkInfo = new BezirkView(bezirk); // convert to BezirkView for accessing imprint url
                if (bezirkInfo.getImprintLink() != null) {
                    detail.setImprintUrl(bezirkInfo.getImprintLink().getSimpleValue().toString());
                }
            }
            // Set Creator
            detail.setCreator(accesscl.getCreator(geoObject.getId()));
            // Last Modified
            detail.setLastModified((Long) dm4.getProperty(geoObject.getId(), "dm4.time.modified"));
            // Either Use KA 2 Bild Assignment ### TOOD: Allow for multiple images
            Topic imageFileTopic = getBildFileAssignment(geoObject);
            if (imageFileTopic != null) {
                detail.setImageUrl("/filerepo/" + imageFileTopic.getChildTopics().getStringOrNull("dm4.files.path"));
                detail.setImageId(imageFileTopic.getId());
            } else {
                // or Kiezatlas 1 "Bild Pfad"
                Topic bildPath = getBildPfadFacetValue(geoObject);
                if (bildPath != null) {
                    detail.setImageUrl(bildPath.getSimpleValue().toString());
                    detail.setImageId(bildPath.getId());
                }
            }
            // Öffnungszeiten Facet
            Topic offnung = facets.getFacet(geoObject, OEFFNUNGSZEITEN_FACET);
            if (offnung != null) detail.setOeffnungszeiten(offnung.getSimpleValue().toString());
            // Beschreibung Facet
            Topic beschreibung = facets.getFacet(geoObject, BESCHREIBUNG_FACET);
            if (beschreibung != null) detail.setBeschreibung(beschreibung.getSimpleValue().toString());
            // Stichworte Facet
            Topic stichworte = facets.getFacet(geoObject, STICHWORTE_FACET);
            if (stichworte != null) detail.setStichworte(stichworte.getSimpleValue().toString());
            // Website Facet
            Topic website = facets.getFacet(geoObject, WEBSITE_FACET);
            if (website != null) detail.setWebpage(website.getSimpleValue().toString());
            detail.setId(geoObject.getId());
            // Collect Comments
            List<RelatedTopic> commentTopics = comments.getComments(geoObject.getId());
            if (commentTopics != null) {
                detail.setComments(assembleCommentViews(commentTopics));
            }
            // Currently residing in "Papierkorb" workspace
            if (isPendingForDeletion(geoObject)) {
                detail.addClassName("in-trash");
            }
        } catch (Exception ex) {
            throw new RuntimeException("Could not assemble EinrichtungsInfo", ex);
        }
        return detail;
    }

    private List<UsernameView> assembleUsernameViews(List<RelatedTopic> assignedUsernames) {
        List<UsernameView> results = new ArrayList<UsernameView>();
        for (RelatedTopic username : assignedUsernames) {
            results.add(new UsernameView(username));
        }
        return results;
    }

    /** ----------------------------- Private Create and Update Geo Object Methdos ----------------------- */

    private void enrichWithBezirksregionAndLOR(Topic geoObject, GeoCoordinate geoCoordinate, EinrichtungView einrichtung) {
        // double check
        if (geoObject == null) {
            log.warning("Can not calculate LOR and Bezirksregion Name when geo object is NULL");
            return;
        }
        // fetch lor and bezirksregion facet
        Topic lorTopic = facets.getFacet(geoObject, LOR_FACET);
        Topic bezirksregionTopic = facets.getFacet(geoObject, BEZIRKSREGION_NAME_FACET);
        // 1. If LOR and Bezirksregions Facet are related - We prioritize these.
        if (bezirksregionTopic != null && lorTopic != null) {
            log.info("Using LOR \"" + lorTopic.getSimpleValue() + "\", Bezirksregion Name \""
                    + bezirksregionTopic.getSimpleValue() + "\" Facet for geo object \"" + geoObject.getSimpleValue() + "\"");
            // give manual (existing assignment) priority over geometrical lookup
            einrichtung.setLORId(lorTopic.getSimpleValue().toString());
            einrichtung.setBezirksregionName(bezirksregionTopic.getSimpleValue().toString());
            einrichtung.setBezirksregionId(bezirksregionTopic.getId());
        } else {
            // alternatively, try new way of getting LOR number
            String lor = geospatial.getGeometryFeatureNameByCoordinate(geoCoordinate.lat + ", " + geoCoordinate.lon);
            if (lor != null) { // if successfull, calculate Bezirksregion name for this LOR
                String lorIdValue = cleanUpShapefileFeatureName(lor);
                einrichtung.setLORId(lorIdValue);
                if (internalLORs.containsKey(lorIdValue)) {
                    Topic lorId = internalLORs.get(lorIdValue);
                    Topic bezirksregion = getBezirksregionUtilName(lorId);
                    if (bezirksregion != null) {
                        log.info("ENRICHED geo object \"" + geoObject.getSimpleValue() + "\" in LOR \""
                                + lorIdValue + "\" (as LOR Facet="+lorTopic+") and (as BZR="+bezirksregionTopic+")"
                                + "Bezirksregion Name by LOR ID: \"" + bezirksregion.getSimpleValue() + "\"");
                        einrichtung.setBezirksregionName(bezirksregion.getSimpleValue().toString());
                        einrichtung.setBezirksregionId(bezirksregion.getId());
                    }
                }
            }
        }
    }

    private String cleanUpShapefileFeatureName(String value) {
        return value.replace(WebsiteService.BEZIRKSREGION_SHAPEFILE_NAME_PREFIX, "");
    }

    private RelatedTopic getLorUtilParent(Topic lorUtilChild) {
        return lorUtilChild.getRelatedTopic("dm4.core.composition", CHILD_ROLE, PARENT_ROLE, LOR_UTIL);
    }

    private RelatedTopic getLorUtilParentOne(Topic lorUtilChild) {
        List<RelatedTopic> lorUtil = lorUtilChild.getRelatedTopics("dm4.core.composition", CHILD_ROLE,
            PARENT_ROLE, LOR_UTIL);
        if (!lorUtil.isEmpty()) {
            return lorUtil.get(0);
        }
        return null;
    }

    private Topic getBezirksUtilName(Topic lorUtilChild) {
        RelatedTopic lorUtil = getLorUtilParentOne(lorUtilChild);
        if (lorUtil != null) {
            return lorUtil.getChildTopics().getTopic(BEZIRK_NAME);
        }
        return null;
    }

    private Topic getBezirksregionUtilName(Topic lorUtilChild) {
        Topic utilParent = getLorUtilParent(lorUtilChild);
        if (utilParent != null) {
            return utilParent.getChildTopics().getTopicOrNull(BEZIRKSREGION_NAME);
        }
        return null;
    }

    private List<CommentView> assembleCommentViews(List<RelatedTopic> comments) {
        List<CommentView> results = new ArrayList<CommentView>();
        for (RelatedTopic comment : comments) {
            CommentView model = new CommentView(null, null);
            model.setMessage(comment.getSimpleValue().toString());
            String contact = comment.getChildTopics().getStringOrNull(CommentsService.COMMENT_CONTACT);
            if (contact != null) {
                model.setContact(contact);
            }
            results.add(model);
        }
        return results;
    }

    private Topic createGeoObjectWithoutWorkspace(final TopicModel geoObjectModel, final Topic geoObject, final String ansprechpartner, final String telefon,
            final String fax, final String email, final String beschreibung, final String oeffnungszeiten,
            final String website, final String coordinatePair, final long district, final List<Long> themen,
            final List<Long> zielgruppen, final List<Long> angebote) {
        try {
            return dm4.getAccessControl().runWithoutWorkspaceAssignment(new Callable<Topic>() {
                @Override
                public Topic call() {
                    Topic geoObject = dm4.createTopic(geoObjectModel);
                    log.info("Created Geo Object ("+geoObject.getSimpleValue()+") without any Workspace Assignment");
                    attachGeoObjectChildTopics(geoObject, ansprechpartner, telefon, fax, email, beschreibung,
                        oeffnungszeiten, website, coordinatePair, district, themen, zielgruppen, angebote);
                    log.info("Attached Geo Object Facets ("+geoObject.getSimpleValue()+") without any Workspace Assignment");
                    return geoObject;
                }
            });
        } catch (Exception e) {
            throw new RuntimeException("Creating User Assignment to Geo Object FAILED", e);
        }
    }

    private boolean deleteCompleteGeoObjectInWorkspace(Topic geoObject) {
        if (!geoObject.getTypeUri().equals(KiezatlasService.GEO_OBJECT)) return false;
        try {
            Topic deletionWs = workspaces.getWorkspace(DELETION_WORKSPACE_URI);
            moveGeoObjecToWorkspace(geoObject, deletionWs, true);
            // notfies system mailbox account (for now)
            sendGeoObjectDeletionNotice("Datensatz in den Papierkorb verschoben", geoObject, accesscl.getUsernameTopic());
            return true;
        } catch (RuntimeException re) {
            log.severe("Geo Object could not be deleted  ("+geoObject+"), RuntimeException Message: " + re.getMessage()
                + " caused by \"" + re.getCause().getMessage() + "\"");
            throw new RuntimeException("Geo object could not be deleted", re);
        }
    }

    private boolean deleteCompleteGeoObject(Topic geoObject) {
        if (!geoObject.getTypeUri().equals(KiezatlasService.GEO_OBJECT)) return false;
        // Start Transaction
        DeepaMehtaTransaction tx = dm4.beginTx();
        try {
            // Kontakt, Bild
            Topic contactFacet = getContactFacet(geoObject);
            Topic imageFacet = getBildPfadFacetValue(geoObject);
            if (contactFacet != null) contactFacet.delete();
            if (imageFacet != null) imageFacet.delete();
            // Beschreibung, Öffnungszeit, Website
            Topic description = facets.getFacet(geoObject, BESCHREIBUNG_FACET);
            Topic oeffnungszeit = facets.getFacet(geoObject, OEFFNUNGSZEITEN_FACET);
            Topic website = facets.getFacet(geoObject, WEBSITE_FACET);
            //
            if (description != null) description.delete();
            if (oeffnungszeit != null) oeffnungszeit.delete();
            if (website != null) website.delete();
            // geoObject.delete(); // fires NO aclexception (and does not delete topics if one occurs)
            dm4.deleteTopic(geoObject.getId()); // fires acl exception if user has no write permission
            return true;
        } catch (RuntimeException re) {
            tx.failure();
            log.severe("Geo Object could not delete geo object ("+geoObject+"), RuntimeException Message: " + re.getMessage()
                + " caused by \"" + re.getCause().getMessage() + "\"");
            return false;
        } finally {
            tx.finish();
        }
    }

    private void attachGeoObjectChildTopics(final Topic geoObject, final String ansprechpartner, final String telefon,
            final String fax, final String email, final String beschreibung, final String oeffnungszeiten,
            final String website, final String coordinatePair, final long district, final List<Long> themen,
            final List<Long> zielgruppen, final List<Long> angebote) {
        try {
            // Store Geo Coordinate
            writeGeoCoordinateFacet(geoObject.getChildTopics().getTopic("dm4.contacts.address"), coordinatePair);
            // Assign the composite contact and two new simple HTML facets
            updateContactFacet(geoObject, ansprechpartner, telefon, email, fax);
            // Both new facet value topics will be assigned to Standard Workspace by default, old is removed
            updateSimpleCompositeFacet(geoObject, BESCHREIBUNG_FACET, BESCHREIBUNG, beschreibung);
            updateSimpleCompositeFacet(geoObject, OEFFNUNGSZEITEN_FACET, OEFFNUNGSZEITEN, oeffnungszeiten);
            // Assign existing Bezirks Topic, Create, Update or Re-use existing Webpage URL and Assign
            writeBezirksFacet(geoObject, district);
            // Calculate bezirksregion via coordinates and LOR geometry
            writeBezirksregionNameFacet(geoObject);
            // All new webbrowser url topics will be assign to Standard Workspace
            writeSimpleKeyCompositeFacet(geoObject, WEBSITE_FACET, "dm4.webbrowser.url", website);
            // Handle Category Relations
            updateCriteriaFacets(geoObject, themen, zielgruppen, angebote);
        } catch (Exception ex) {
            Logger.getLogger(WebsitePlugin.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    private Association createUserAssignment(final Topic geoObject) {
        final Topic usernameTopic = getUsernameTopic();
        return createUserAssignment(geoObject, usernameTopic);
    }

    private Association createUserAssignment(final Topic topic, final Topic username) {
        return createUserAssignment(topic, username, false);
    }

    private Association createUserAssignment(final Topic topic, final Topic username, final boolean assignToWorkspace) {
        if (!isTopicAssignedToUsername(topic, username.getSimpleValue().toString())) {
            try {
                return dm4.getAccessControl().runWithoutWorkspaceAssignment(new Callable<Association>() {
                    @Override
                    public Association call() {
                        Association assignment = dm4.createAssociation(mf.newAssociationModel(USER_ASSIGNMENT,
                            mf.newTopicRoleModel(topic.getId(), DEFAULT_ROLE),
                            mf.newTopicRoleModel(username.getId(), DEFAULT_ROLE)));
                        log.info("Created Kiezatlas User Assignment ("+username.getSimpleValue()+") for Topic \""
                                + topic.getSimpleValue() + "\" without Workspace Assignment");
                        if (assignToWorkspace) { // Place in "Confirmation" Workspace
                            workspaces.assignToWorkspace(assignment, getConfirmationWorkspace().getId());
                        }
                        return assignment;
                    }
                });
            } catch (Exception e) {
                throw new RuntimeException("Creating User Assignment to Topic FAILED", e);
            }
        }
        return null;
    }

    private Association deleteUserAssignment(final Topic topic, final Topic usernameTopic) {
        if (isTopicAssignedToUsername(topic, usernameTopic.getSimpleValue().toString())) {
            try {
                Association assoc = topic.getAssociation(USER_ASSIGNMENT, null, null, usernameTopic.getId());
                if (assoc != null) {
                    dm4.deleteAssociation(assoc.getId());
                    return assoc;
                } else {
                    throw new RuntimeException("Deleting User Assignment to Topic FAILED - Assoc not found");
                }
            } catch (Exception e) {
                throw new RuntimeException("Deleting User Assignment to Topic FAILED", e);
            }
        }
        return null;
    }

    private Association createBildAssignment(final Topic geoObject, final Topic username, final long fileTopicId) {
        final Topic usernameTopic = username;
        if (isGeoObjectEditable(geoObject, username) || isTopicAssignedToUsername(geoObject, usernameTopic.getSimpleValue().toString())) {
            try {
                return dm4.getAccessControl().runWithoutWorkspaceAssignment(new Callable<Association>() {
                    @Override
                    public Association call() {
                        // Create a geo object <-> file topic relation
                        Association assignment = dm4.createAssociation(mf.newAssociationModel(BILD_ASSIGNMENT,
                            mf.newTopicRoleModel(geoObject.getId(), DEFAULT_ROLE),
                            mf.newTopicRoleModel(fileTopicId, DEFAULT_ROLE)));
                        // ### Workspace Selection Either OR ...
                        log.info("Created Bild Assignment ("+username+") for Geo Object \"" + geoObject.getSimpleValue()
                            + "\" and File Topic \""+files.getFile(fileTopicId).toString()+"\"");
                        privilegedAssignToWorkspace(assignment, angebote.getAngeboteWorkspace().getId());
                        return assignment;
                    }
                });
            } catch (Exception e) {
                throw new RuntimeException("Creating User Assignment to Geo Object FAILED", e);
            }
        } else {
            log.info("User has no permission to update Bild Assignment ("+username+") for Geo Object \"" + geoObject.getSimpleValue()
                            + "\" and File Topic \""+files.getFile(fileTopicId).toString()+"\"");
        }
        return null;
    }

    private List<Topic> searchGeoObjectsNearby(String coordinates, double radius) {
        List<Topic> results = new ArrayList<Topic>();
        double lon, lat;
        // 1) Parse Coordinate values
        if (coordinates != null && !coordinates.isEmpty() && coordinates.contains(",")) {
            lon = Double.parseDouble(coordinates.split(",")[0].trim());
            lat = Double.parseDouble(coordinates.split(",")[1].trim());
            log.info("Spatial Geo Object Search @" + coordinates + " r=" + radius);
            List<Topic> geoCoordTopics = geospatial.getTopicsWithinDistance(new GeoCoordinate(lon, lat), radius);
            // 2) Process spatial search results (=topics of type Geo Coordinate)
            for (Topic geoCoordTopic : geoCoordTopics) {
                Topic geoObject = kiezatlas.getGeoObjectByGeoCoordinate(geoCoordTopic);
                // spatial search may deliver geo coordinates topics not (anymore) related to a geo object
                if (geoObject != null) results.add(geoObject);
            }
        } else {
            log.warning("Searching Geo Objects Failed due to based Coordinates given: " + coordinates);
        }
        return results;
    }

    /** ------------------- Model and Facet Model Helper Methods ------------------------ **/

    private void updateBildPfadFacet(Topic geoObject, String imageFilePath) {
        facets.updateFacet(geoObject, IMAGE_FACET,
            mf.newFacetValueModel(IMAGE_PATH).put(imageFilePath));
    }

    private Topic getContactFacet(Topic geoObject) {
        return facets.getFacet(geoObject, KONTAKT_FACET);
    }

    private Topic getBildPfadFacetValue(Topic geoObject) {
        return facets.getFacet(geoObject, IMAGE_FACET);
    }

    private Topic getBildFileAssignment(Topic geoObject) {
        return geoObject.getRelatedTopic(BILD_ASSIGNMENT, DEFAULT_ROLE, DEFAULT_ROLE, "dm4.files.file");
    }

    private Topic getBezirksregionFacet(Topic facettedTopic) {
        return facets.getFacet(facettedTopic, BEZIRKSREGION_NAME_FACET);
    }

    private void updateSimpleCompositeFacet(Topic geoObject, String facetTypeUri, String childTypeUri, String value) {
        facets.updateFacet(geoObject.getId(), facetTypeUri, mf.newFacetValueModel(childTypeUri).put(value.trim()));
    }

    private void addCityTopicValue(ChildTopicsModel model, long value) {
        model.putRef("dm4.contacts.city", value);
    }

    private void addStreetTopicValue(ChildTopicsModel model, String value) {
        if (value.isEmpty()) return;
        List<Topic> streetNames = dm4.searchTopics(value.trim(), "dm4.contacts.street");
        for (Topic streetName : streetNames) {
            if (streetName.getSimpleValue().toString().equals(value.trim())) {
                model.putRef("dm4.contacts.street", streetName.getId());
                return;
            }
        }
        log.info("Creating new Street Topic for value \"" + value.trim() + "\"");
        model.put("dm4.contacts.street", value.trim());
    }

    private void addPostalCodeValue(ChildTopicsModel model, String value) {
        if (value.isEmpty()) value = POSTAL_CODE_DUMMY_VALUE;
        List<Topic> postalCodes = dm4.searchTopics(value.trim(), "dm4.contacts.postal_code");
        for (Topic postalCode : postalCodes) {
            if (postalCode.getSimpleValue().toString().equals(value.trim())) {
                model.putRef("dm4.contacts.postal_code", postalCode.getId());
                return;
            }
        }
        log.info("Creating new Postal Code Topic for value \"" + value.trim() + "\"");
        model.put("dm4.contacts.postal_code", value.trim());
    }

    private void addCountryTopicValue(ChildTopicsModel model, long value) {
        model.putRef("dm4.contacts.country", value);
    }

    /** see duplicate in GeomapsPlugin.storeGeoCoordinate() */
    private void writeGeoCoordinateFacet(Topic address, String coordinatePair) {
        // ### Just write new coordinates IF values changed.
        double longitude, latitude;
        longitude = Double.parseDouble(coordinatePair.split(",")[0]);
        latitude = Double.parseDouble(coordinatePair.split(",")[1]);
        log.info("Storing geo coordinate (" + latitude +","+ longitude + ") for addressTopic=" + address.getId());
        FacetValueModel value = mf.newFacetValueModel("dm4.geomaps.geo_coordinate").put(mf.newChildTopicsModel()
            .put("dm4.geomaps.longitude", longitude)
            .put("dm4.geomaps.latitude",  latitude)
        );
        facets.updateFacet(address, "dm4.geomaps.geo_coordinate_facet", value);
    }

    @Override
    public List<RelatedTopic> getAllCategories(Topic geoObject) {
        List<RelatedTopic> cats = new ArrayList<RelatedTopic>();
        List<RelatedTopic> themen = facets.getFacets(geoObject, THEMA_FACET);
        List<RelatedTopic> zielgruppen = facets.getFacets(geoObject, ZIELGRUPPE_FACET);
        List<RelatedTopic> angebot = facets.getFacets(geoObject, ANGEBOT_FACET);
        cats.addAll(themen);
        cats.addAll(zielgruppen);
        cats.addAll(angebot);
        return cats;
    }

    private void updateCriteriaFacets(Topic geoObject, List<Long> themen, List<Long> zielgruppen, List<Long> angebote) {
        List<RelatedTopic> formerThemen = facets.getFacets(geoObject, THEMA_FACET);
        List<RelatedTopic> formerZielgruppen = facets.getFacets(geoObject, ZIELGRUPPE_FACET);
        List<RelatedTopic> formerAngebote = facets.getFacets(geoObject, ANGEBOT_FACET);
        delFacetTopicReferences(geoObject, formerThemen, THEMA_FACET, THEMA_CRIT);
        delFacetTopicReferences(geoObject, formerZielgruppen, ZIELGRUPPE_FACET, ZIELGRUPPE_CRIT);
        delFacetTopicReferences(geoObject, formerAngebote, ANGEBOT_FACET, ANGEBOT_CRIT);
        putFacetTopicsReferences(geoObject, themen, THEMA_FACET, THEMA_CRIT);
        putFacetTopicsReferences(geoObject, zielgruppen, ZIELGRUPPE_FACET, ZIELGRUPPE_CRIT);
        putFacetTopicsReferences(geoObject, angebote, ANGEBOT_FACET, ANGEBOT_CRIT);
    }

    private void updateContactFacet(Topic geoObject, String ansprechpartner, String telefon, String email, String fax) {
        Topic kontakt = getContactFacet(geoObject);
        if (kontakt == null) { // Create
            FacetValueModel facetValue = mf.newFacetValueModel(KONTAKT);
            facetValue.put(mf.newChildTopicsModel()
                .put(KONTAKT_ANSPRECHPARTNER, ansprechpartner.trim())
                .put(KONTAKT_MAIL, email.trim())
                .put(KONTAKT_TEL, telefon.trim())
                .put(KONTAKT_FAX, fax.trim())
            );
            facets.updateFacet(geoObject, KONTAKT_FACET, facetValue);
        } else { // Update through Overwrite
            kontakt.getChildTopics().set(KONTAKT_ANSPRECHPARTNER, ansprechpartner.trim());
            kontakt.getChildTopics().set(KONTAKT_MAIL, email.trim());
            kontakt.getChildTopics().set(KONTAKT_TEL, telefon.trim());
            kontakt.getChildTopics().set(KONTAKT_FAX, fax.trim());
        }
    }

    private void writeSimpleKeyCompositeFacet(Topic geoObject, String facetTypeUri, String childTypeUri, String value) {
        // check if a former value was already assigned and we're updating
        Topic oldFacetTopic = facets.getFacet(geoObject.getId(), facetTypeUri);
        // check if new value is empty
        if (value.trim().isEmpty() && oldFacetTopic != null) {
            log.info("Passed empty value as new simple key composite facet (" + childTypeUri + ") - DELETING facet value");
            facets.updateFacet(geoObject, facetTypeUri, mf.newFacetValueModel(childTypeUri)
                    .putDeletionRef(oldFacetTopic.getId()));
            return;
        }
        // check if new value already exist in a topic/db and if so, reference that
        try { // and if it exists, we might need to catch an AccessControlException...
            Topic keyTopic = dm4.getTopicByValue(childTypeUri, new SimpleValue(value.trim()));
            if (oldFacetTopic != null && oldFacetTopic.getSimpleValue().toString().equals(value.trim())) {
                // old value is existent and same as new value, do nothing
            } else if (keyTopic != null) { // reference existing topic
                facets.updateFacet(geoObject.getId(), facetTypeUri,
                    mf.newFacetValueModel(childTypeUri).putRef(keyTopic.getId()));
            } else { // create new topic with new value
                facets.updateFacet(geoObject.getId(), facetTypeUri,
                    mf.newFacetValueModel(childTypeUri).put(value.trim()));
            }
        } catch (RuntimeException re) { // If fetching an existing value fails, eg. ACL we def. create a new one
            facets.updateFacet(geoObject.getId(), facetTypeUri,
                mf.newFacetValueModel(childTypeUri).put(value.trim()));
        }
    }

    private void writeBezirksFacet(Topic geoObject, long bezirksTopicId) {
        if (bezirksTopicId > NEW_TOPIC_ID) {
            facets.updateFacet(geoObject.getId(), BEZIRK_FACET,
                mf.newFacetValueModel(BEZIRK).putRef(bezirksTopicId));
        } else {
            throw new RuntimeException("Writing bezirks facet failed because of invalid bezirks topic id=" + bezirksTopicId);
        }
    }

    private void writeBezirksregionNameFacet(Topic geoObject) {
        GeoCoordinate coordinates = kiezatlas.getGeoCoordinateByGeoObject(geoObject);
        if (coordinates != null) {
            String lorName = geospatial.getGeometryFeatureNameByCoordinate(coordinates.lat + "," + coordinates.lon);
            if (lorName != null) {
                String cleanedLorID = lorName.replace(WebsiteService.BEZIRKSREGION_SHAPEFILE_NAME_PREFIX, "");
                Topic lorUtil = null;
                if (internalLORs.containsKey(cleanedLorID)) {
                    lorUtil = internalLORs.get(cleanedLorID);
                    Topic utilParent = lorUtil.getRelatedTopic("dm4.core.composition", null, null, LOR_UTIL);
                    Topic bezirksregion = utilParent.getChildTopics().getTopicOrNull(BEZIRKSREGION_NAME);
                    facets.updateFacet(geoObject, BEZIRKSREGION_NAME_FACET,
                        mf.newFacetValueModel(BEZIRKSREGION_NAME).putRef(bezirksregion.getId()));
                    log.info("ASSIGNED geo object \"" + geoObject.getSimpleValue() + "\" to Bezirksregion \"" + bezirksregion.getSimpleValue() + "\"");
                    // workspaces.assignToWorkspace(geoObject, website.getStandardWorkspace().getId());
                } else {
                    log.warning("Could NOT assign geo object \"" + geoObject.getSimpleValue() + "\" as Bezirksregion Name is UNKNOWN \"" + cleanedLorID + "\"");
                }
            } else {
                log.warning("Could NOT find LOR of geo object \"" + geoObject.getSimpleValue() + "\" with GeoCoordinates \"" + coordinates + "\"");
            }
        } else {
            log.warning("Could NOT assign geo object \"" + geoObject.getSimpleValue() + "\" as it has NO GEO COORDINATE");
        }
    }

    private void delFacetTopicReferences(Topic geoObject, List<RelatedTopic> topics, String facetTypeUri, String childTypeUri) {
        for (Topic topic : topics) {
            facets.updateFacet(geoObject, facetTypeUri,
                mf.newFacetValueModel(childTypeUri).addDeletionRef(topic.getId()));
        }
    }

    private void putFacetTopicsReferences(Topic geoObject, List<Long> ids, String facetTypeUri, String childTypeUri) {
        for (Long id : ids) {
            facets.updateFacet(geoObject.getId(), facetTypeUri, mf.newFacetValueModel(childTypeUri).addRef(id));
        }
    }

    private void populateInternalLORIDMapCache() {
        // Builds up lor name -> id topicmap
        List<Topic> lorIds = dm4.getTopicsByType("ka2.util.lor_id");
        for (Topic lorId : lorIds) {
            this.internalLORs.put(lorId.getSimpleValue().toString(), lorId);
        }
        log.info("Populated LOR ID <-> Topic Cache on plugin startup");
    }

    /** --------------------------- Workspace Assignment Helper Methods ----------------------------- */

    private void initiallyAssignSingleFacetToWorkspace(Topic object, String facetTypeUri, long workspaceId) {
        log.info("Initially Assigning Single Facet Type URI: " + facetTypeUri + " to Workspace " + workspaceId);
        Topic facetTopicValue = facets.getFacet(object, facetTypeUri);
        // ## Handles single-facets
        if (facetTopicValue == null) return;
        // ## Iterate over all facet value topic childs and assign them too
        initiallyAssignRelatedFacetChildTopics(facetTopicValue, workspaceId);
        // Association assignment first
        Association facetAssoc = dm4.getAssociation(null, object.getId(), facetTopicValue.getId(), null, null);
        privilegedAssignToWorkspace(facetAssoc, workspaceId);
        privilegedAssignToWorkspace(facetTopicValue, workspaceId);
        log.info("Assigned \""+facetTypeUri+"\" Facet Topic Value : " + facetTopicValue.getId() + " to Workspace incl. relating Association");
    }

    private void initiallyAssignMultiFacetToWorkspace(Topic object, String facetTypeUri, long workspaceId) {
        log.info("Initially Assigning Multi Facet Type URI: " + facetTypeUri + " to Workspace " + workspaceId);
        List<RelatedTopic> facetTopicValues = facets.getFacets(object, facetTypeUri);
        for (RelatedTopic facetTopicValue : facetTopicValues) {
            initiallyAssignRelatedFacetChildTopics(facetTopicValue, workspaceId);
            privilegedAssignToWorkspace(facetTopicValue.getRelatingAssociation(), workspaceId);
            privilegedAssignToWorkspace(facetTopicValue, workspaceId);
        }
    }

    private void initiallyAssignRelatedFacetChildTopics(Topic facetTopicValue, long workspaceId) {
        List<String> typeUris = new ArrayList<String>();
            typeUris.add("dm4.core.aggregation");
            typeUris.add("dm4.core.composition");
        List<RelatedTopic> childTopics = facetTopicValue.getRelatedTopics(typeUris, PARENT_ROLE, CHILD_ROLE, null);
        Iterator<RelatedTopic> iterator = childTopics.iterator();
        while (iterator.hasNext()) {
            RelatedTopic topic = iterator.next();
            privilegedAssignToWorkspace(topic, workspaceId);
            privilegedAssignToWorkspace(topic.getRelatingAssociation(), workspaceId);
            log.info("> Assigned Facet Child Topic " + topic.toString()
                + " and relating Assoc " + topic.getRelatingAssociation() + " to Workspace \"" + workspaceId + "\"");
        }
    }

    private void moveSingleFacetToWorkspace(Topic object, String facetTypeUri, long workspaceId) {
        log.info("Moving Single Facet Type URI: " + facetTypeUri + " to Workspace " + workspaceId);
        Topic facetTopicValue = facets.getFacet(object, facetTypeUri);
        // ## Handles single-facets
        if (facetTopicValue == null) return;
        // ## Iterate over all facet value topic childs and assign them too
        moveRelatedFacetChildTopicsToWorkspace(facetTopicValue, workspaceId);
        // Association assignment first
        Association facetAssoc = dm4.getAssociation(null, object.getId(), facetTopicValue.getId(), null, null);
        workspaces.assignToWorkspace(facetAssoc, workspaceId);
        workspaces.assignToWorkspace(facetTopicValue, workspaceId);
        log.info("Moved \""+facetTypeUri+"\" Facet Topic Value : " + facetTopicValue.getId() + " to Workspace incl. relating Association");
    }

    private void moveRelatedFacetChildTopicsToWorkspace(Topic facetTopicValue, long workspaceId) {
        List<String> typeUris = new ArrayList<String>();
            typeUris.add("dm4.core.aggregation");
            typeUris.add("dm4.core.composition");
        List<RelatedTopic> childTopics = facetTopicValue.getRelatedTopics(typeUris, PARENT_ROLE, CHILD_ROLE, null);
        Iterator<RelatedTopic> iterator = childTopics.iterator();
        while (iterator.hasNext()) {
            RelatedTopic topic = iterator.next();
            workspaces.assignToWorkspace(topic, workspaceId);
            workspaces.assignToWorkspace(topic.getRelatingAssociation(), workspaceId);
            log.info("> Moved Facet Child Topic " + topic.toString()
                + " and relating Assoc " + topic.getRelatingAssociation() + " to Workspace \"" + workspaceId + "\"");
        }
    }

    private void moveMultiFacetToWorkspace(Topic object, String facetTypeUri, long workspaceId) {
        log.info("Move Multi Facet Type URI: " + facetTypeUri + " to Workspace " + workspaceId);
        List<RelatedTopic> facetTopicValues = facets.getFacets(object, facetTypeUri);
        for (RelatedTopic facetTopicValue : facetTopicValues) {
            moveRelatedFacetChildTopicsToWorkspace(facetTopicValue, workspaceId);
            workspaces.assignToWorkspace(facetTopicValue.getRelatingAssociation(), workspaceId);
            workspaces.assignToWorkspace(facetTopicValue, workspaceId);
        }
    }

    private String parseFirstCoordinatePair(String jsonGoogleLocation) {
        String result = "";
        try {
            JSONObject response = new JSONObject(jsonGoogleLocation);
            JSONArray results = response.getJSONArray("results");
            // JSONObject geometry = results.();
            for (int i=0; i < results.length(); i++) {
                JSONObject obj = results.getJSONObject(i);
                // log.info("> Result: " + obj.toString());
                JSONObject geometry = obj.getJSONObject("geometry");
                JSONObject location = geometry.getJSONObject("location");
                log.info("Location: " + location.toString() + " Type: " + geometry.getString("location_type"));
                DecimalFormat df = new DecimalFormat("#.000");
                df.setRoundingMode(RoundingMode.HALF_DOWN);
                return df.format(location.getDouble("lng")) + "," + df.format(location.getDouble("lat"));
            }
        } catch (JSONException ex) {
            Logger.getLogger(WebsitePlugin.class.getName()).log(Level.SEVERE, null, ex);
        }
        return result;
    }

    private void sendConfirmationNotice(List<String> mailboxes, Topic geoObject) {
        String recipients = buildRecipientsString(mailboxes);
        String url = SignupPlugin.DM4_HOST_URL+"website/geo/" + geoObject.getId();
        signup.sendUserMailboxNotification(recipients, "Dein Kiezatlas Eintrag wurde freigeschaltet",
                "<br/>Liebe/r KiezAtlas-Nutzer_in,<br/><br/>"
                + "dein Eintrag wurde soeben best&auml;tigt.<br/><br/>"
                + "Name des Eintrags: \"" + geoObject.getSimpleValue().toString() + "\"<br/>"
                + "<a href=\""+url+"\">Link zum Eintrag</a><br/><br/>Vielen Dank f&uuml;r deine Unterst&uuml;tzung<br/><br/>Ciao!");
    }

    private void sendGeoObjectDeletionNotice(String subject, Topic geoObject, Topic username) {
        String recipients = buildEditorialNotificationRecipients(geoObject, false, true, true);
        String detailsPage = SignupPlugin.DM4_HOST_URL+"website/geo/" + geoObject.getId();
        String loginPage = SignupPlugin.DM4_HOST_URL + "sign-up/login";
        signup.sendUserMailboxNotification(recipients, subject, "<br/>Liebe/r Super-Administrator_in,<br/><br/>"
            + "ein Einrichtungsdatensatz wurde von \""+username.getSimpleValue().toString()+"\" zur L&ouml;schung vorgeschlagen. "
            + "Bitte schaue mal ob Du diesen nicht gleich richtig l&ouml;schen kannst.<br/><br/>"
            + "Name des neuen Eintrags: \"" + geoObject.getSimpleValue().toString() + "\"<br/>"
            + "<a href=\""+detailsPage+"\">Link zum gel&ouml;schten Datensatz</a> bzw. zum <a href=\""+loginPage+"\">Kiezatlas-Login</a><br/>"
            + "<br/><br/>Ok, das war's schon.<br/><br/>Danke + Ciao!");
    }

    private void sendGeoObjectCreationNotice(String subject, Topic geoObject, Topic username) {
        String recipients = buildEditorialNotificationRecipients(geoObject, false, false, true);
        String detailsPage = SignupPlugin.DM4_HOST_URL+"website/geo/" + geoObject.getId();
        String loginPage = SignupPlugin.DM4_HOST_URL + "sign-up/login";
        signup.sendUserMailboxNotification(recipients, subject, "<br/>Liebe/r Bezirk-Administrator_in,<br/><br/>"
            + "es gibt einen neuen Einrichtungsdatensatz von \""+username.getSimpleValue().toString()+"\"."
                    + "Bitte schaue mal ob Du diesen nicht gleich freischalten kannst.<br/><br/>"
            + "Name des neuen Eintrags: \"" + geoObject.getSimpleValue().toString() + "\"<br/>"
            + "<a href=\""+detailsPage+"\">Link zur Freischaltung</a> bzw. zum <a href=\""+loginPage+"\">Kiezatlas-Login</a><br/>"
            + "<br/><br/>Ok, das war's schon.<br/><br/>Danke + Ciao!");
    }

    private String buildEditorialNotificationRecipients(Topic geoObject, boolean regionalOnly,
            boolean districtOnly, boolean addSystemMailbox) {
        Topic bezirk = getRelatedBezirk(geoObject);
        Topic bezirksregion = getRelatedBezirksregion(geoObject);
        List<String> mailboxes = getAssignedAdministrativeMailboxes(bezirk, bezirksregion, regionalOnly,
                districtOnly, addSystemMailbox);
        StringBuilder recipients = new StringBuilder();
        if (mailboxes != null && mailboxes.size() > 0) {
            recipients = new StringBuilder(buildRecipientsString(mailboxes));
            recipients.append(";");
        } else {
            log.warning("No Kiez-Administrator Mailboxes could be retrieved via Bezirks or Bezirksregion relation "
                + "of geo object id=\"" + geoObject.getId() + "\" to NOTIFY, using System Mailbox");
            recipients.append(SYSTEM_MAINTENANCE_MAILBOX);
        }
        return recipients.toString();
    }

    private String buildRecipientsString(List<String> mailboxes) {
        String recipients = "";
        int recipientCount = 1;
        for (String mailbox : mailboxes) {
            recipients += mailbox;
            if (recipientCount < mailboxes.size()) recipients += ";";
            recipientCount++;
        }
        return recipients;
    }

    private String preparePhraseOrTermLuceneQuery(String userQuery) {
        StringBuilder queryPhrase = new StringBuilder();
        if (userQuery.contains(" ")) {
            queryPhrase.append("\"" + userQuery + "\"");
            queryPhrase.append(" OR ");
            queryPhrase.append("" + userQuery.replaceAll(" ", "?") + "*");
            queryPhrase.append(" OR ");
            String[] words = userQuery.split(" ");
            for (int i = 0; i < words.length; i++) {
                String word = words[i];
                queryPhrase.append("*" + word + "*");
                if (i < words.length -1) {
                    queryPhrase.append(" AND ");
                } else {
                    queryPhrase.append(" ");
                }
            }
        } else {
            queryPhrase.append("*" + userQuery + "*");
        }
        return queryPhrase.toString();
    }

    /** Find 1:1 copy in dm4-kiezatlas-angebote plugin */
    private String prepareLuceneQueryString(String userQuery, boolean doSplitWildcards,
                                            boolean appendWildcard, boolean doExact, boolean leadingWildcard) {
        String queryPhrase = new String();
        // 1) split query input by whitespace and append a wildcard to each term
        if (doSplitWildcards) {
            String[] terms = userQuery.split(" ");
            int count = 1;
            for (String term : terms) {
                if (appendWildcard && !term.isEmpty()) {
                    queryPhrase += term + "* ";
                } else if (!term.isEmpty()) {
                    queryPhrase += term;
                    if (terms.length < count) queryPhrase += " ";
                }
                count++;
            }
            queryPhrase = queryPhrase.trim();
        } else if (doExact) {
            // 3) remove (potential "?", introduced as trigger for exact search), quote query input and append fuzzy command
            queryPhrase = userQuery.trim().replaceAll("\\?", "");
            queryPhrase = "\"" + queryPhrase + "\"~0.9";
        } else if (!doSplitWildcards && !appendWildcard && !leadingWildcard) {
            // 4) if none, return trimmed user query input
            queryPhrase = userQuery.trim();
        } else if (appendWildcard && leadingWildcard && !doSplitWildcards) {
            queryPhrase = "*" + userQuery.trim() + "*";
        } else if (appendWildcard && !doSplitWildcards) {
            // 2) trim and append a wildcard to the query input
            queryPhrase = userQuery.trim() + "*";
        } else if (leadingWildcard && !doSplitWildcards) {
            queryPhrase = "*" + userQuery.trim();
        }
        log.info("Prepared Query Phrase \""+userQuery+"\" => \""+queryPhrase+"\" (doSplitWildcards: "
            + doSplitWildcards + ", appendWildcard: " + appendWildcard + ", leadingWildcard: "
            + leadingWildcard +", doExact: " + doExact + ")");
        return queryPhrase;
    }


    /** ----------------- Rest of the Kiezatlas Application Model Related Getter Utilies -------------------------- */

    private void addGeoObjectToResults(HashMap<Long, Topic> uniqueResults, Topic geoObject) {
        if (geoObject != null && !uniqueResults.containsKey(geoObject.getId())) {
            uniqueResults.put(geoObject.getId(), geoObject);
        }
    }

    private Topic getAssignedWorkspace(Topic geoObject) {
        return workspaces.getAssignedWorkspace(geoObject.getId());
    }

    @Override
    public Topic getStandardWorkspace() {
        return workspaces.getWorkspace(workspaces.DEEPAMEHTA_WORKSPACE_URI);
    }

    @Override
    public Topic getConfirmationWorkspace() {
        return dm4.getAccessControl().getWorkspace(CONFIRMATION_WS_URI);
    }

    @Override
    public Topic getDeletionWorkspace() {
        return dm4.getAccessControl().getWorkspace(DELETION_WORKSPACE_URI);
    }

    private Topic getUsernameTopic() {
        String username = accesscl.getUsername();
        if (username != null && !username.isEmpty()) {
            return accesscl.getUsernameTopic(username);
        } else {
            return null;
        }
    }

    private Topic getParentGeoObjectTopic(Topic entry) {
        Topic result = null;
        try {
            result = entry.getRelatedTopic(null, CHILD_ROLE, PARENT_ROLE, KiezatlasService.GEO_OBJECT);
        } catch (RuntimeException ex) {
            log.warning("Exception loading parent geo object topic cause \"" + ex.getLocalizedMessage() + "\"");
            return result;
        }
        if (result == null) log.warning("Search Result Entry: " +entry.getTypeUri()
            + ", " +entry.getId() +" has no Geo Object as PARENT"); // fulltext searches also "abandoned" facet topics
        return result;
    }

    /** private Topic getFirstParentGeoObjectTopic(Topic entry) {
        List<RelatedTopic> results = entry.getRelatedTopics("dm4.core.aggregation", CHILD_ROLE,
            PARENT_ROLE, KiezatlasService.GEO_OBJECT);
        return (results != null && results.size() > 0 ) ? results.get(0) : null;
    } **/

    private Topic getRelatedBezirk(Topic geoObject) {
        Topic bezirk = geoObject.getRelatedTopic("dm4.core.aggregation", PARENT_ROLE, CHILD_ROLE, "ka2.bezirk");
        if (bezirk == null) log.warning("Geo Object ("+geoObject+") is NOT related to a specific BEZIRK");
        return bezirk;
    }

    private Topic getRelatedBezirksregion(Topic geoObject) {
        return facets.getFacet(geoObject, BEZIRKSREGION_NAME_FACET);
    }

    private Topic getRelatedAddressStreetName(Topic geoObject) {
        Topic address = geoObject.getChildTopics().getTopicOrNull("dm4.contacts.address");
        if (address == null) log.warning("Geo Object ("+geoObject+") has no related ADDRESS topic");
        return address.getChildTopics().getTopicOrNull("dm4.contacts.street");
    }

    private List<RelatedTopic> getStreetNameRelatedGeoObjects(List<Topic> streetNames) {
        List<RelatedTopic> places = new ArrayList<RelatedTopic>();
        log.warning("> searching " + streetNames.size() + " streetnames for related geo object topics");
        for (Topic streetName : streetNames) {
            List<RelatedTopic> addresses = streetName.getRelatedTopics("dm4.core.aggregation", "dm4.core.child", "dm4.core.parent", "dm4.contacts.address");
            if (addresses == null || addresses.size() <= 0) {
            } else {
                for (RelatedTopic address : addresses) {
                    List<RelatedTopic> geoObjects = address.getRelatedTopics("dm4.core.composition", "dm4.core.child", "dm4.core.parent", "ka2.geo_object");
                    places.addAll(geoObjects);
                }
            }
        }
        return places;
    }

    private List<RelatedTopic> getStreetRelatedAddressTopics(List<Topic> streetNames) {
        List<RelatedTopic> addresses = new ArrayList<RelatedTopic>();
        log.warning("> searching " + streetNames.size() + " streetnames for related address topics");
        for (Topic streetName : streetNames) {
            List<RelatedTopic> relatedAddresses = streetName.getRelatedTopics("dm4.core.aggregation", "dm4.core.child", "dm4.core.parent", "dm4.contacts.address");
            addresses.addAll(relatedAddresses);
        }
        return addresses;
    }

    private List<RelatedTopic> getRegionRelatedGeoObjects(List<Topic> bezirksregionen) {
        List<RelatedTopic> places = new ArrayList<RelatedTopic>();
        log.warning("> searching " + bezirksregionen.size() + " bezirksregionen for related geo object topics");
        for (Topic bezirksregion : bezirksregionen) {
            List<RelatedTopic> geoObjects = bezirksregion.getRelatedTopics("dm4.core.aggregation", "dm4.core.child", "dm4.core.parent", "ka2.geo_object");
            if (geoObjects == null || geoObjects.size() <= 0) {
            } else {
                places.addAll(geoObjects);
            }
        }
        return places;
    }

    private void collectMailBoxes(List<String> mailboxes, List<RelatedTopic> usernames) {
        for (RelatedTopic username : usernames) {
            try {
                String emailAddress = dm4.getAccessControl().getEmailAddress(username.getSimpleValue().toString());
                if (emailAddress != null && !emailAddress.isEmpty()) {
                    mailboxes.add(emailAddress);
                    log.info("> Added " + emailAddress + " to the notification-loop");
                }
            } catch (RuntimeException re) {
                log.warning("No Email Address assigned to username " + username);
            }
        }
    }

    private List<String> getAssignedAdministrativeMailboxes(Topic bezirk, Topic bezirksregion, boolean onlyRegional,
            boolean onlyDistrict, boolean addSystemMailbox) {
        List<String> mailboxes = new ArrayList<String>();
        if (bezirk != null && (!onlyRegional || onlyDistrict)) {
            List<RelatedTopic> usernames = bezirk.getRelatedTopics("dm4.core.association", DEFAULT_ROLE,
                DEFAULT_ROLE, "dm4.accesscontrol.username");
            log.info("Add Bezirks Ansprechpartner for " + bezirk.getSimpleValue().toString() + " to the Notification-Loop... ");
            collectMailBoxes(mailboxes, usernames);
        }
        if (bezirksregion != null && !onlyDistrict) {
            List<RelatedTopic> regionals = bezirksregion.getRelatedTopics(USER_ASSIGNMENT, DEFAULT_ROLE,
                DEFAULT_ROLE, "dm4.accesscontrol.username");
            log.info("Add Bezirksregion Ansprechpartner for " + bezirksregion.getSimpleValue().toString() + " to the Notification-Loop... ");
            collectMailBoxes(mailboxes, regionals);
        }
        if (addSystemMailbox) mailboxes.add(SYSTEM_MAINTENANCE_MAILBOX);
        return mailboxes;
    }

    /** Informs editors of their geo object about changes. */
    private List<String> getAssignedUserMailboxes(Topic geoObject) {
        List<String> mailboxes = new ArrayList<String>();
        List<RelatedTopic> usernames = getAssignedUsernames(geoObject);
        for (RelatedTopic username : usernames) {
            String emailAddress = dm4.getAccessControl().getEmailAddress(username.getSimpleValue().toString());
            if (emailAddress != null && !emailAddress.isEmpty()) {
                mailboxes.add(emailAddress);
            }
        }
        return mailboxes;
    }

    private boolean hasRelatedBezirk(Topic geoObject, long bezirksId) {
        Topic relatedBezirk = getRelatedBezirk(geoObject);
        if (relatedBezirk == null) return false;
        if (relatedBezirk.getId() == bezirksId) return true;
        return false;
    }

    /**
     * Works for "dm4.core.aggregation" edges and "dm4.core.association".
     * @param geoObject
     * @param topicId
     * @return boolean  A primitate value representing wether a relation exists or not.
     */
    private boolean hasRelatedTopicAssociatedAsChild(Topic geoObject, long topicId) {
        return (dm4.getAssociation(null, geoObject.getId(), topicId,
            PARENT_ROLE, CHILD_ROLE) != null);
    }

    private List<? extends Topic> getAngebotCriteriaTopics() {
        return sortAlphabeticalDescending(dm4.getTopicsByType("ka2.criteria.angebot"));
    }

    private List<? extends Topic> getThemaCriteriaTopics() {
        return sortAlphabeticalDescending(dm4.getTopicsByType("ka2.criteria.thema"));
    }

    private List<? extends Topic> getZielgruppeCriteriaTopics() {
        return sortAlphabeticalDescending(dm4.getTopicsByType("ka2.criteria.zielgruppe"));
    }

    private List<Topic> getAvailableLORNumberTopics() {
        List<Topic> countries = new ArrayList<Topic>();
        for (Topic city : dm4.getTopicsByType("ka2.lor_nummer")) {
            if (!city.getUri().isEmpty()) countries.add(city);
        }
        return countries;
    }

    private List<Topic> getAvailableTraegerTopics() {
        List<Topic> countries = new ArrayList<Topic>();
        for (Topic city : dm4.getTopicsByType("ka2.traeger")) {
            if (!city.getUri().isEmpty()) countries.add(city);
        }
        return countries;
    }

    private List<Topic> getAvailableCountryTopics() {
        List<Topic> countries = new ArrayList<Topic>();
        for (Topic city : dm4.getTopicsByType("dm4.contacts.country")) {
            if (!city.getUri().isEmpty()) countries.add(city);
        }
        return countries;
    }

    private List<Topic> getAvailableCityTopics() {
        List<Topic> cities = new ArrayList<Topic>();
        for (Topic city : dm4.getTopicsByType("dm4.contacts.city")) {
            if (!city.getUri().isEmpty()) cities.add(city);
        }
        return cities;
    }

    /** 
     * Cached progressively, loaded once per bundle refresh.
     * @return 
     */
    private List<Topic> getAvailableDistrictTopics() {
        // Attention: list of districts is never loaded twice (per runtime)
        if (availableDistricts != null) return availableDistricts;
        List<Topic> topics = dm4.getTopicsByType("ka2.bezirk");
        List<Topic> results = topics;
        sortAlphabeticalDescending(results);
        availableDistricts = results;
        return results;
    }

    private List<RelatedTopic> getUserDistrictTopics() {
        Topic username = accesscl.getUsernameTopic();
        return getUserDistrictTopics(username);
    }

    private List<RelatedTopic> getUserSubregionTopics() {
        Topic username = accesscl.getUsernameTopic();
        return getUserSubregionTopics(username);
    }

    private List<RelatedTopic> getUserDistrictTopics(Topic username) {
        if (username != null) {
            List<RelatedTopic> topics = username.getRelatedTopics("dm4.core.association", null, null, BEZIRK);
            log.info("Loaded related " + topics.size() + " bezirks topic");
            return topics;
        }
        return null;
    }

    private List<RelatedTopic> getUserSubregionTopics(Topic username) {
        if (username != null) {
            List<RelatedTopic> topics = username.getRelatedTopics(USER_ASSIGNMENT, null, null, BEZIRKSREGION_NAME);
            log.info("Loaded related " + topics.size() + " bezirksregion topic");
            return topics;
        }
        return null;
    }

    private List<? extends Topic> sortAlphabeticalDescending(List<? extends Topic> topics) {
        Collections.sort(topics, new Comparator<Topic>() {
            public int compare(Topic t1, Topic t2) {
                String one = t1.getSimpleValue().toString().toLowerCase();
                one = one.replaceAll("ä", "ae");
                one = one.replaceAll("ü", "ue");
                one = one.replaceAll("ö", "oe");
                one = one.replaceAll("ß", "ss");
                String two = t2.getSimpleValue().toString().toLowerCase();
                two = two.replaceAll("ä", "ae");
                two = two.replaceAll("ü", "ue");
                two = two.replaceAll("ö", "oe");
                two = two.replaceAll("ß", "ss");
                return one.compareTo(two);
            }
        });
        return topics;
    }

    private void sortByModificationDateDescending(List<? extends Topic> topics) {
        Collections.sort(topics, new Comparator<Topic>() {
            public int compare(Topic t1, Topic t2) {
                // this may be (probably insignificantly) faster than using timeservice
                long one = (Long) t1.getProperty("dm4.time.modified"); //should use time.getModificationDate(t1.getId())
                long two = (Long) t2.getProperty("dm4.time.modified"); //should use time.getModificationDaet(t2.getId())
                if (one > two) return -1;
                if (two > one) return 1;
                return 0;
            }
        });
    }

    private void sortBySimpleValueDescending(List<? extends Topic> topics) {
        Collections.sort(topics, new Comparator<Topic>() {
            public int compare(Topic t1, Topic t2) {
                String one = t1.getSimpleValue().toString().toLowerCase();
                String two = t2.getSimpleValue().toString().toLowerCase();
                return one.compareTo(two);
            }
        });
    }

    private void initiallyAssignGeoObjectFacetsToWorkspace(Topic geoObject, Topic workspace) {
        Topic addressObject = geoObject.getChildTopics().getTopic("dm4.contacts.address");
        initiallyAssignSingleFacetToWorkspace(addressObject, "dm4.geomaps.geo_coordinate_facet", workspace.getId());
        initiallyAssignSingleFacetToWorkspace(geoObject, BESCHREIBUNG_FACET, workspace.getId());
        initiallyAssignSingleFacetToWorkspace(geoObject, OEFFNUNGSZEITEN_FACET, workspace.getId());
        initiallyAssignSingleFacetToWorkspace(geoObject, BEZIRK_FACET, workspace.getId());
        initiallyAssignSingleFacetToWorkspace(geoObject, BEZIRKSREGION_NAME_FACET, workspace.getId());
        initiallyAssignSingleFacetToWorkspace(geoObject, WEBSITE_FACET, workspace.getId());
        initiallyAssignMultiFacetToWorkspace(geoObject, THEMA_FACET, workspace.getId()); // Topics already in "Kiezatlas"
        initiallyAssignMultiFacetToWorkspace(geoObject, ZIELGRUPPE_FACET, workspace.getId()); // But Associations new
        initiallyAssignMultiFacetToWorkspace(geoObject, ANGEBOT_FACET, workspace.getId());
    }

    private void initiallyAssignGeoObjecToWorkspace(Topic geoObject, Topic workspace) {
        ChildTopics geoObjectChilds = geoObject.loadChildTopics().getChildTopics();
        Topic addressObject = geoObjectChilds.getTopic("dm4.contacts.address");
        ChildTopics addressChilds = addressObject.loadChildTopics().getChildTopics();
        privilegedAssignToWorkspace(geoObject, workspace.getId());
        privilegedAssignToWorkspace(geoObjectChilds.getTopic("ka2.geo_object.name"), workspace.getId());
        /* privilegedAssignToWorkspace(coordinateTopic, workspace.getId());
        privilegedAssignToWorkspace(coordinateChilds.getTopic("dm4.geomaps.longitude"), workspace.getId());
        privilegedAssignToWorkspace(coordinateChilds.getTopic("dm4.geomaps.latitude"), workspace.getId()); */
        privilegedAssignToWorkspace(addressObject, workspace.getId());
        privilegedAssignToWorkspace(addressChilds.getTopicOrNull("dm4.contacts.street"), workspace.getId());
        privilegedAssignToWorkspace(addressChilds.getTopic("dm4.contacts.postal_code"), workspace.getId());
        privilegedAssignToWorkspace(addressChilds.getTopic("dm4.contacts.city"), workspace.getId());
        Topic addressCountry = addressChilds.getTopicOrNull("dm4.contacts.country");
        privilegedAssignToWorkspace(addressCountry, workspace.getId());
        log.info("Basic Geo Object, Address and Coordinate Facet now assigned to Workspace \"" + workspace.getSimpleValue() + "\"");
    }

    /** ### FIXME: Move user_assignment edge to new workspace too! */
    private void moveGeoObjecToWorkspace(Topic geoObject, Topic workspace, boolean deletion) {
        ChildTopics geoObjectChilds = geoObject.loadChildTopics().getChildTopics();
        Topic addressObject = geoObjectChilds.getTopic("dm4.contacts.address");
        ChildTopics addressChilds = addressObject.loadChildTopics().getChildTopics();
        Topic coordinateTopic = kiezatlas.getGeoCoordinateFacet(addressObject);
        coordinateTopic.loadChildTopics();
        workspaces.assignToWorkspace(geoObject, workspace.getId());
        workspaces.assignToWorkspace(geoObjectChilds.getTopic("ka2.geo_object.name"), workspace.getId());
        if (!deletion) { // in case of confirmation, move everything, in case of deletion, just the geo object
            workspaces.assignToWorkspace(coordinateTopic, workspace.getId());
            workspaces.assignToWorkspace(coordinateTopic.getChildTopics().getTopic("dm4.geomaps.longitude"), workspace.getId());
            workspaces.assignToWorkspace(coordinateTopic.getChildTopics().getTopic("dm4.geomaps.latitude"), workspace.getId());
            workspaces.assignToWorkspace(addressObject, workspace.getId());
            Topic streetNr = addressChilds.getTopicOrNull("dm4.contacts.street");
            if (streetNr != null) {
                log.info("Moving street to workspace" + workspace);
                workspaces.assignToWorkspace(streetNr, workspace.getId());
            }
            workspaces.assignToWorkspace(addressChilds.getTopic("dm4.contacts.postal_code"), workspace.getId());
            workspaces.assignToWorkspace(addressChilds.getTopic("dm4.contacts.city"), workspace.getId());
            Topic addressCountry = addressChilds.getTopicOrNull("dm4.contacts.country");
            if (addressCountry != null) {
                log.info("Moving address to workspace" + workspace);
                workspaces.assignToWorkspace(addressCountry, workspace.getId());
            }
        }
        log.info("Basic Geo Object, Address and Coordinate Facet moved to Workspace \"" + workspace.getSimpleValue() + "\"");
    }

    private void moveGeoObjecFacetsToWorkspace(Topic geoObject, Topic workspace) {
        Topic addressObject = geoObject.getChildTopics().getTopic("dm4.contacts.address");
        moveSingleFacetToWorkspace(addressObject, "dm4.geomaps.geo_coordinate_facet", workspace.getId());
        // ## Move Kontakt
        moveSingleFacetToWorkspace(geoObject, BESCHREIBUNG_FACET, workspace.getId());
        moveSingleFacetToWorkspace(geoObject, OEFFNUNGSZEITEN_FACET, workspace.getId());
        moveSingleFacetToWorkspace(geoObject, BEZIRK_FACET, workspace.getId());
        moveSingleFacetToWorkspace(geoObject, BEZIRKSREGION_NAME_FACET, workspace.getId());
        moveSingleFacetToWorkspace(geoObject, WEBSITE_FACET, workspace.getId());
        moveMultiFacetToWorkspace(geoObject, THEMA_FACET, workspace.getId()); // Topics already in "Kiezatlas"
        moveMultiFacetToWorkspace(geoObject, ZIELGRUPPE_FACET, workspace.getId()); // But Associations new
        moveMultiFacetToWorkspace(geoObject, ANGEBOT_FACET, workspace.getId());
        log.info("Moved Geo Object Facets to Workspace \"" + workspace.getSimpleValue() + "\"");
    }



    /** -----------------------  Other Utility Resources (Geo Coding and Reverse Geo Coding) ----------------------- */

    private String geoCodeAddressInput(String addressValue) {
        String query = addressValue;
        String result = "";
        try {
            // Encoded url to open
            log.info("Requested geo code query=\"" + query + "\" - Processing");
            query = URLEncoder.encode(query, "UTF-8");
            String url = "https://maps.googleapis.com/maps/api/geocode/json?address="
                + query + "&sensor=false&locale=de&key=" + GOOGLE_API_KEY;
            URLConnection connection = new URL(url).openConnection();
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Charset", "UTF-8");
            // Get the response
            BufferedReader rd = new BufferedReader(new InputStreamReader(connection.getInputStream(),
                "UTF-8"));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = rd.readLine()) != null) {
                sb.append(line);
            }
            rd.close();
            result = sb.toString();
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
        return result;
    }

    private List<CoordinatesView> getGoogleStreetCoordinates(String addressInput) {
        String response = geoCodeAddressInput(addressInput);
        List<CoordinatesView> entries = new ArrayList();
        try {
            JSONObject objects = new JSONObject(response);
            JSONArray results = objects.getJSONArray("results");
            for (int i=0; i < results.length(); i++) {
                JSONObject item = results.getJSONObject(i);
                // JSONArray address_c = item.getJSONArray("address_components");
                JSONObject geometry = item.getJSONObject("geometry");
                if (geometry != null) {
                    JSONObject location = geometry.getJSONObject("location");
                    String name = item.getString("formatted_address");
                    CoordinatesView streetCoords = new CoordinatesView();
                    streetCoords.setCoordinates(new GeoCoordinate(location.getDouble("lng"), location.getDouble("lat")));
                    streetCoords.setName(name);
                    entries.add(streetCoords);
                }
            }
        } catch (JSONException ex) {
            Logger.getLogger(WebsitePlugin.class.getName()).log(Level.SEVERE, null, ex);
        }
        return entries;
    }

    /**
     * Returns name for the given coordinate pair by (unauthenticated) asking Google Geocode API.
     * @param inputValue    String containing an URL encoded latitude longitude value pair.
     * @return
     */
    private String geoCodeLocationInput(String inputValue) {
        String result = "";
        try {
            String url = "https://maps.googleapis.com/maps/api/geocode/json?latlng="
                    + inputValue + "&language=de&key=" + GOOGLE_API_KEY;
            // &result_type=street_address|postal_code&key=API_KEY
            URLConnection connection = new URL(url).openConnection();
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Charset", "UTF-8");
            // Get the response
            BufferedReader rd = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = rd.readLine()) != null) {
                sb.append(line);
            }
            rd.close();
            result = sb.toString();
            log.info("Reverse Geo Coded Location ("+inputValue+") successfully.");
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
        return result;
    }

    private void prepareFooterMenuItems() {
        List<MenuItem> siteItems = webpages.getWebsiteMenuItems("standard");
        List<MenuItem> techItems = webpages.getWebsiteMenuItems("admin");
        viewData("standardItems", siteItems);
        viewData("techblogItems", techItems);
    }

    private boolean isInvalidSearchQuery(String query) {
        return (query.isEmpty() || query.equals("*") || query.length() < 3);
    }

    @Override
    public void postUpdateTopic(Topic topic, TopicModel newModel, TopicModel oldModel) {
        if (topic.getTypeUri().equals("ka2.website.web_alias")) {
            initializeCityMapWebAliasResources();
        }
    }

    @Override
    public void webpageRequested(AbstractContext context, String webAlias, String sitePrefix) {
        preparePageTemplate(webAlias);
    }

    @Override
    public void frontpageRequested(AbstractContext context, Topic website, String name) {
        if (name.equals("/")) {
            // frontpage root resource
            log.info("Kiezatlas frontpage requested");
            prepareSearchTemplateParameter(null, 0, "quick", "place", "undefined");
        } else {
            // citymap resource
            log.info("Citymap at /" + name + " requested");
            Topic citymap = dm4.getTopicByValue("ka2.website.web_alias", new SimpleValue(name));
            if (citymap != null) { // requested custom resource is not a citymap topic
                prepareSearchTemplateParameter(null, citymap.getId(), "quick", "place", "undefined");
            }
        }
        preparePageTemplate(name);
    }

    @Override
    public void resourceNotFound(AbstractContext context, String webAlias, String sitePrefix) {
        log.info("Kiezatlas 2.0 received a 404 for request on \"/" + sitePrefix + "/" + webAlias + "\"");
        context.setVariable("message", "An dieser Adresse unseres Koordinatensystems haben wir keine weiteren Informationen");
        preparePageTemplate(webAlias);
        prepareSearchTemplateParameter(null, 0, "quick", "place", "undefined");
    }


    @Override
    public void signupResourceRequested(AbstractContext context, String templateName) {
        log.info("Kiezatlas Website providing template data for sign-up resources...");
        preparePageTemplate(templateName);
    }

    @Override
    public void angeboteResourceRequested(AbstractContext context, String templateName) {
        preparePageTemplate(templateName);
    }

}
