package de.kiezatlas.website;

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
import de.deepamehta.facets.FacetsService;
import de.deepamehta.files.FilesService;
import de.deepamehta.geomaps.model.GeoCoordinate;
import de.deepamehta.geomaps.GeomapsService;
import de.deepamehta.plugins.geospatial.GeospatialService;
import de.deepamehta.thymeleaf.ThymeleafPlugin;
import de.deepamehta.workspaces.WorkspacesService;
import de.kiezatlas.KiezatlasService;
import de.kiezatlas.angebote.AngebotService;
import de.kiezatlas.angebote.model.AngebotsInfoAssigned;
import static de.kiezatlas.website.WebsiteService.BESCHREIBUNG;
import static de.kiezatlas.website.WebsiteService.BESCHREIBUNG_FACET;
import static de.kiezatlas.website.WebsiteService.CONFIRMATION_WS_URI;
import static de.kiezatlas.website.WebsiteService.OEFFNUNGSZEITEN;
import static de.kiezatlas.website.WebsiteService.OEFFNUNGSZEITEN_FACET;
import static de.kiezatlas.website.WebsiteService.WEBSITE_FACET;
import de.kiezatlas.website.model.BezirkInfo;
import de.kiezatlas.website.model.EinrichtungsInfo;
import de.kiezatlas.website.model.GeoObjectDetailsView;
import de.kiezatlas.website.model.GeoObjectView;
import de.mikromedia.webpages.WebpageService;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLEncoder;
import java.text.DecimalFormat;
import java.util.logging.Level;
import java.util.HashMap;
import java.util.concurrent.Callable;
import javax.ws.rs.FormParam;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.POST;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 * The module bundling the Kiezatlas 2 Website.<br/>
 * Based on dm47-kiezatlas-2.1.7-SNAPSHOT, dm47-kiezatlas-etl-0.2.1-SNAPSHOT and dm47-webpages-0.3.<br/>
 * Compatible with DeepaMehta 4.7
 * <a href="http://github.com/mukil/dm4-kiezatlas-website">Source Code</a>
 *
 * @author Malte Reißig (<a href="mailto:malte@mikromedia.de">Contact</a>)
 * @version 0.3-SNAPSHOT
 */
@Path("/website")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class WebsitePlugin extends ThymeleafPlugin implements WebsiteService {

    private final Logger log = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaceService;
    @Inject private AccessControlService acService;
    @Inject private WebpageService pageService;
    @Inject private GeospatialService spatialService;
    @Inject private AngebotService angeboteService;
    @Inject private GeomapsService geomapsService;
    @Inject private FacetsService facetsService;
    @Inject private FilesService fileService;
    @Inject KiezatlasService kiezatlas;

    // Application Cache of District Overview Resultsets
    HashMap<Long, List<GeoObjectView>> districtsCache = new HashMap<Long, List<GeoObjectView>>();
    HashMap<Long, Long> districtCachedAt = new HashMap<Long, Long>();

    // The URIs of KA2 Geo Object topics synchronized (and kept up-to-date in) Kiezatlas 1 have this prefix.
    // The remaining part of the URI is the original KA1 topic id.
    private static final String KA1_GEO_OBJECT_URI_PREFIX = "de.kiezatlas.topic.";

    /**
     * Sets the Kiezatlas Website index.html as main resource to be served at "/" by the webpages-module.
     */
    @Override
    public void init() {
        pageService.setFrontpageResource("/views/index.html", "de.kiezatlas.website");
        initTemplateEngine();
    }

    /** Responds witha a Viewable,the frontpage of the Kiezatlas Website. */
    @GET
    @Produces(MediaType.TEXT_HTML)
    public Viewable getWebsite() {
        return view("index");
    }

    @GET
    @Path("/user/menu")
    @Produces(MediaType.TEXT_HTML)
    public Viewable getWebsiteMenu() throws URISyntaxException {
        if (!isAuthenticated()) return getUnauthorizedPage();
        if (!isConfirmationWorkspaceMember()) throw new WebApplicationException(Response.temporaryRedirect(new URI("/angebote/my")).build());
        return view("menu");
    }

    /** Responds with a Viewable, the administrative confirmation page of the Kiezatlas Website.  */
    @GET
    @Path("/confirmation")
    @Produces(MediaType.TEXT_HTML)
    public Viewable getAdministrativeConfirmationPage() {
        Topic confirmationWs = getPrivilegedWorkspace();
        if (confirmationWs == null) return getUnauthorizedPage();
        List<RelatedTopic> unconfirmedGeoObjects = confirmationWs.getRelatedTopics("dm4.core.aggregation", "dm4.core.child",
            "dm4.core.parent", KiezatlasService.GEO_OBJECT);
        // ResultList<RelatedTopic> availableWebsites = dm4.getTopics("ka2.website", 0);
        // viewData("websites", availableWebsites);
        List<RelatedTopic> sortedGeoObjects = unconfirmedGeoObjects;
        List<EinrichtungsInfo> results = new ArrayList();
        sortByModificationDateDescending(sortedGeoObjects);
        for (RelatedTopic geoObject : sortedGeoObjects) {
            EinrichtungsInfo einrichtung = assembleGeneralEinrichtungsInfo(geoObject);
            einrichtung.setAssignedUsername(getFirstUsernameAssigned(geoObject));
            results.add(einrichtung);
        }
        preparePageAuthorization();
        viewData("availableLor", getAvailableLORNumberTopics());
        viewData("workspace", getStandardWorkspace());
        viewData("geoobjects", results);
        return view("confirmation");
    }

    /**
     * Builds up a form for introducing a NEW Kiezatlas Einrichtung (Geo Object).
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/topic/create")
    public Viewable getGeoObjectEditPage() {
        if (!isAuthenticated()) return getUnauthorizedPage();
        EinrichtungsInfo geoObject = new EinrichtungsInfo();
        geoObject.setCoordinates(new GeoCoordinate(13.4, 52.5));
        geoObject.setName("Neuer Eintrag");
        geoObject.setId(-1);
        viewData("geoobject", geoObject);
        viewData("themen", new ArrayList<RelatedTopic>());
        viewData("zielgruppen", new ArrayList<RelatedTopic>());
        prepareFormWithAvailableTopics();
        preparePageAuthorization();
        viewData("workspace", getPrivilegedWorkspace());
        return view("edit");
    }

    /**
     * Processes the form for creating a Kiezatlas Einrichtung in a specific Workspace.
     */
    @POST
    @Produces(MediaType.TEXT_HTML)
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Path("/topic/save")
    @Transactional
    public Viewable processGeoObjectForm(@FormParam("id") long topicId, @FormParam("name") String name, @FormParam("strasse") String strasse,
            @FormParam("plz") String plz, @FormParam("city") long city, @FormParam("district") long district, @FormParam("fileTopicId") long fileId,
            @FormParam("googleDistrictName") String googleDistrict, @FormParam("country") long country, @FormParam("beschreibung") String beschreibung,
            @FormParam("open") String oeffnungszeiten, @FormParam("ansprechpartner") String ansprechpartner,
            @FormParam("telefon") String telefon, @FormParam("email") String email, @FormParam("fax") String fax,
            @FormParam("website") String website, @FormParam("lat") double latitude, @FormParam("lon") double longitude,
            @FormParam("themen") List<Long> themen, @FormParam("angebote") List<Long> angebote, @FormParam("zielgruppen") List<Long> zielgruppen) {
        if (!isAuthenticated()) return getUnauthorizedPage();
        Topic geoObject = null;
        Topic username = acService.getUsernameTopic(acService.getUsername());
        String coordinatePair = "", geoLocation = "";
        if (district == -1 && !googleDistrict.isEmpty()) { // no district selected, trying magic
            district = mapGoogleDistrictNameToKiezatlasBezirksTopic(googleDistrict);
            if (district == -1) log.warning("> Automatisches Mapping des Bezirks für Einrichtung ist FEHLGESCHLAGEN.");
            if (district > 0) log.info("> Automatisches Mapping des Bezirks für Einrichtung war ERFOLGREICH, ID: " + district);
        } else if (district == -1 && googleDistrict.isEmpty()) {
            viewData("message", "Bitte w&auml;hlen Sie den den passenden Bezirk f&uuml;r diese Einrichtung aus");
            // ### Test this route
            return (topicId == -1 || topicId == 0) ? getGeoObjectEditPage() : getGeoObjectEditPage(topicId);
        }
        // Handle Geo Coordinates of Geo Object
        if (latitude == -1000 || longitude == -1000) {
            geoLocation = geoCodeAddressInput(URLEncoder.encode(strasse + ", " + plz + " " + city));
            coordinatePair = parseFirstCoordinatePair(geoLocation);
            log.info("> Reset Geo Coordinates by Street, Postal Code, City Value to \"" + coordinatePair + "\"");
        } else {
            log.info("> Geo Coordinates provided: " + latitude + ", " + longitude);
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
        if (topicId == -1 || topicId == 0) {
            try {
                log.info("// ---------- CREATing Einrichtung " + name + " ---------------------- // ");
                // ------------ Assign Geo Object Basics to the topic of getPrivilegedWorkspace() ------------------ //
                // Saving Address needs "dm4_no_geocoding=true" Cookie, otherwise it geo-codes automatically
                geoObject = createUnconfirmedGeoObject(mf.newTopicModel("ka2.geo_object", geoObjectTopicModel));
                createUserAssignment(geoObject, acService.getUsername());
                attachGeoObjectChildTopics(geoObject, ansprechpartner, telefon, fax, email, beschreibung,
                    oeffnungszeiten, website, coordinatePair, district, themen, zielgruppen, angebote);
                // Handle Image-File Upload (Seperately)
                log.info("> Bild File Topic Upload is file at=\"" + fileService.getFile(fileId).toString());
                createBildAssignment(geoObject, username, fileId);
                // ### Send Notification to EDITOR with basic infos on the "confirmation" process
                viewData("message", "Vielen Dank, Sie haben erfolgreich einen neuen Ort in den Kiezatlas eingetragen. "
                    + "Eine Kiez-AdministratorIn wurde benachrichtigt und wir werden den Eintrag so schnell wie m&ouml;glich freischalten.");
            } catch (Exception ex) {
                Logger.getLogger(WebsitePlugin.class.getName()).log(Level.SEVERE, null, ex);
            }
        } else {
            log.info("// ---------- UPDATing Einrichtung " + name + " (TopicID: " + topicId + ") -------------- // ");
            geoObject = dm4.getTopic(topicId);
            if (isGeoObjectEditable(geoObject, username)) {
                // the following should create new street, postal code, city and country topics (which is not what we want)
                geoObject.setChildTopics(geoObjectTopicModel);
                // ### attachGeoObjectChildTopics
            } else {
                viewData("message", "Sie sind aktuell leider nicht berechtigt diesen Datensatz zu bearbeiten.");
                return getUnauthorizedPage();
            }
        }
        log.info("#### Geo Object Form Processing Topic Result: " + geoObject);
        viewData("geoobject", geoObject);
        return getSimpleMessagePage();
    }

    /**
     * Builds up a form for editing a Kiezatlas Einrichtung.
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/topic/edit/{topicId}")
    public Viewable getGeoObjectEditPage(@PathParam("topicId") long topicId) {
        // ### Handle the case if user cannot edit anymore (just see) directly after confirmation.
        Topic geoObject = dm4.getTopic(topicId);
        if (!isAuthenticated()) return getUnauthorizedPage();
        Topic username = acService.getUsernameTopic(acService.getUsername());
        if (isGeoObjectTopic(geoObject)) {
            if (isAssignedUsername(geoObject, username)) {
                EinrichtungsInfo einrichtung = assembleGeneralEinrichtungsInfo(geoObject);
                einrichtung.setAssignedUsername(username.getSimpleValue().toString());
                viewData("geoobject", einrichtung);
                viewData("themen", facetsService.getFacets(geoObject, THEMA_FACET));
                viewData("zielgruppen", facetsService.getFacets(geoObject, ZIELGRUPPE_FACET));
                // viewData("angebote", facetsService.getFacets(geoObject, ANGEBOT_FACET).getItems());
            } else {
                viewData("message", "Sie haben aktuell noch nicht die n&ouml;tigen Berechtigungen "
                    + "um diesen Einrichtungsdatensatz zu bearbeiten.");
                return getGeoObjectDetailsPage(geoObject.getId());
            }
        } else if (isKiezatlas2GeoObject(geoObject)) {
            viewData("message", "Dieser Einrichtungsdatensatz wird aktuell noch in Kiezatlas 1 gepflegt, "
                + "Sie k&ouml;nnen diesen daher nicht &uuml;ber diese Benutzeroberfl&auml;che aktualisieren.");
            return getGeoObjectDetailsPage(geoObject.getId());
        } else {
            return getPageNotFound("Eine Einrichtung mit dieser ID ist uns nicht bekannt.");
        }
        prepareFormWithAvailableTopics();
        // this makes sure we keep all (potentially new) child topics in the same workspace its parent is while editing
        viewData("workspace", getAssignedWorkspace(geoObject));
        viewData("editable", isGeoObjectEditable(geoObject, username));
        return view("edit");
    }

    /**
     * Builds up a form for editing a Kiezatlas Einrichtung.
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/topic/confirm/{topicId}")
    @Transactional
    public Viewable doConfirmGeoObject(@PathParam("topicId") long topicId) {
        // ### Handle the case if user cannot edit anymore (just see) directly after confirmation.
        Topic geoObject = dm4.getTopic(topicId);
        if (!isAuthenticated()) return getUnauthorizedPage();
        Topic username = acService.getUsernameTopic(acService.getUsername());
        if (!isConfirmationWorkspaceMember()) {
            viewData("message", "Sie haben aktuell noch keine Berechtigungen neue Datens&auml;tze zu veröffentlichen.");
            return getUnauthorizedPage();
        }
        if (isGeoObjectTopic(geoObject) || isAssignedUsername(geoObject, username)) {
            Topic deepaMehtaWs = getStandardWorkspace();
            ChildTopics geoObjectChilds = geoObject.loadChildTopics().getChildTopics();
            Topic addressObject = geoObjectChilds.getTopic("dm4.contacts.address");
            ChildTopics addressChilds = addressObject.loadChildTopics().getChildTopics();
            Topic coordinateTopic = kiezatlas.getGeoCoordinateTopic(addressObject);
            ChildTopics coordinateChilds = coordinateTopic.getChildTopics();
            assignToWorkspace(geoObject, deepaMehtaWs.getId());
            assignToWorkspace(geoObjectChilds.getTopic("ka2.geo_object.name"), deepaMehtaWs.getId());
            assignToWorkspace(coordinateTopic, deepaMehtaWs.getId());
            assignToWorkspace(coordinateChilds.getTopic("dm4.geomaps.longitude"), deepaMehtaWs.getId());
            assignToWorkspace(coordinateChilds.getTopic("dm4.geomaps.latitude"), deepaMehtaWs.getId());
            assignToWorkspace(addressObject, deepaMehtaWs.getId());
            assignToWorkspace(addressChilds.getTopic("dm4.contacts.street"), deepaMehtaWs.getId());
            assignToWorkspace(addressChilds.getTopic("dm4.contacts.postal_code"), deepaMehtaWs.getId());
            assignToWorkspace(addressChilds.getTopic("dm4.contacts.city"), deepaMehtaWs.getId());
            Topic addressCountry = addressChilds.getTopicOrNull("dm4.contacts.country");
            if (addressCountry != null) {
                assignToWorkspace(addressCountry, deepaMehtaWs.getId());
            }
            log.info("Assigned Geo Object to Standard Workspace \"" + deepaMehtaWs.getSimpleValue() + "\"");
            viewData("message", "Der Eintrag \"" + geoObject.getSimpleValue() + "\" erfolgreich freigeschaltet.");
        } else {
            viewData("message", "Eine Einrichtung mit dieser ID ist uns nicht bekannt.");
            return getPageNotFound();
        }
        return getGeoObjectDetailsPage(geoObject.getId());
    }

    public Viewable getGeoObjectDetailsPage(@PathParam("topicId") long topicId) {
        Topic geoObject = dm4.getTopic(topicId);
        Topic username = getUsernameTopic();
        if (!isGeoObjectTopic(geoObject)) return getPageNotFound();
        // Assemble Generic Einrichtungs Infos
        EinrichtungsInfo einrichtung = assembleGeneralEinrichtungsInfo(geoObject);
        // ### Yet Missing: Träger, Bezirksregion, Bezirk, Administrator Infos und Stichworte
        viewData("geoobject", einrichtung);
        // Assemble Category Assignments for Einrichtung;
        viewData("zielgruppen", facetsService.getFacets(geoObject, ZIELGRUPPE_FACET));
        viewData("themen", facetsService.getFacets(geoObject, THEMA_FACET));
        // viewData("angebote", facetsService.getFacets(geoObject, ANGEBOT_FACET));
        // Assemble Angebosinfos for Einrichtung
        List<AngebotsInfoAssigned> angebotsInfos = angeboteService.getAngebotsInfosAssigned(geoObject);
        if (angebotsInfos.size() > 0) viewData("angebotsinfos", angebotsInfos);
        preparePageAuthorization();
        viewData("editable", isGeoObjectEditable(geoObject, username));
        return view("detail");
    }

    public Viewable getSimpleMessagePage() {
        return view("message");
    }

    /**
     * Renders details about a Kiezatlas Geo Object into HTML.
     *
     * @param topicId
     * @return
     */
    @GET
    @Path("/topic/{topicId}")
    @Produces(MediaType.TEXT_HTML)
    public Viewable getGeoObjectDetailsPage(@PathParam("topicId") String topicId) {
        Topic geoObject = null;
        if (topicId.startsWith("t-")) {
            geoObject = dm4.getTopicByUri("de.kiezatlas.topic." + topicId);
        } else {
            geoObject = dm4.getTopic(Long.parseLong(topicId));
        }
        return (geoObject != null) ? getGeoObjectDetailsPage(geoObject.getId()) : getPageNotFound();
    }

    /**
     * Fetches details about a Kiezatlas Geo Object.
     *
     * ### Revise DTO.
     *
     * @param referer
     * @param topicId
     * @return A GeoObject DetailsView as DTO to presend details about a place.
     */
    @GET
    @Path("/topic/{topicId}")
    @Produces(MediaType.APPLICATION_JSON)
    public GeoObjectDetailsView getGeoObjectDetails(@HeaderParam("Referer") String referer,
            @PathParam("topicId") long topicId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        Topic geoObject = dm4.getTopic(topicId);
        GeoObjectDetailsView geoDetailsView = null;
        if (isGeoObjectTopic(geoObject)) {
            geoDetailsView = new GeoObjectDetailsView(dm4.getTopic(topicId), geomapsService, angeboteService);
        }
        return geoDetailsView;
    }

    /**
     * Fetches Geo Objects to be displayed in a map by WGS 84 coordinate pair (Longitude, Latitude)
     * and a numerical radius (provide in km).
     * @param coordinates
     * @param radius
     */
    @GET
    @Path("/search/{coordinatePair}/{radius}")
    public List<GeoObjectView> getGeoObjectsNearBy(@PathParam("coordinatePair") String coordinates,
            @PathParam("radius") String radius) {
        // .) ### Authenticate...
        // 0) Set default coordinates for a query
        double lon = 13.4, lat = 52.5;
        if (coordinates != null && !coordinates.isEmpty() && coordinates.contains(",")) {
            lon = Double.parseDouble(coordinates.split(",")[0].trim());
            lat = Double.parseDouble(coordinates.split(",")[1].trim());
        }
        // 1) Set default search radius for a query
        double r = (radius.isEmpty() || radius.equals("0")) ? 1.0 : Double.parseDouble(radius);
        List<Topic> geoCoordTopics = spatialService.getTopicsWithinDistance(new GeoCoordinate(lon, lat), r);
        ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
        // 2) Process spatial search results (=topics of type Geo Coordinate)
        for (Topic geoCoordTopic : geoCoordTopics) {
            // 2.1) Check for an Address topic
            Topic address = geoCoordTopic.getRelatedTopic("dm4.core.composition", "dm4.core.child",
                "dm4.core.parent", "dm4.contacts.address");
            if (address != null) {
                // 2.1.1) If place has an address set, create a DTO for map display
                List<RelatedTopic> geoObjects = address.getRelatedTopics("dm4.core.composition",
                    "dm4.core.child", "dm4.core.parent", "ka2.geo_object");
                for (RelatedTopic geoObject : geoObjects) {
                    if (isGeoObjectTopic(geoObject)) {
                        results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
                    }
                }
            } else {
                // 2.1.2) If place has NO address set, skip place for map display
                log.log(Level.INFO, "No Address Entry found for geo coordinate {0}", geoCoordTopic.getSimpleValue());
            }
        }
        return results;
    }

    /**
     * Fetches a list of Geo Objects to be displayed in a map by name.
     * Ditch searchGeoObjectNames in KiezatlasPlugin (used by Famportal-Angular service).
     * @param referer
     * @param query
     */
    @GET
    @Path("/search/by_name")
    public List<GeoObjectView> searchGeoObjectsByName(@HeaderParam("Referer") String referer,
            @QueryParam("query") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            log.log(Level.INFO, "> nameQuery=\"{0}\"", query);
            String queryValue = query.trim();
            ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
            if (queryValue.isEmpty()) {
                log.warning("No search term entered, returning empty resultset");
                return results;
            }
            List<Topic> singleTopics = dm4.searchTopics(queryValue, "ka2.geo_object.name");
            log.log(Level.INFO, "{0} name topics found", singleTopics.size());
            for (Topic topic : singleTopics) {
                Topic geoObject = topic.getRelatedTopic("dm4.core.composition",
                    "dm4.core.child", "dm4.core.parent", "ka2.geo_object");
                results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
            }
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics by name failed", e);
        }
    }

    /**
     * Builds up a list of search results (Geo Objects to be displayed in a map) by text query.
     * @param referer
     * @param query
     */
    @GET
    @Path("/search")
    public List<GeoObjectView> searchGeoObjectsFulltext(@HeaderParam("Referer") String referer,
            @QueryParam("search") String query) {
        // .) ### Authenticate
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        // TODO: Maybe it is also desirable that we wrap the users query into quotation marks
        // (to allow users to search for a combination of words)
        try {
            ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
            if (query.isEmpty()) {
                log.warning("No search term entered, returning empty resultset");
                return results;
            }
            // 1) Fetch unique geo object topics by text query string
            List<Topic> geoObjects = searchFulltextInGeoObjectChilds(query);
            // 2) Process saerch results and create DTS for map display
            log.info("Start building response for " + geoObjects.size() + " OVERALL");
            for (Topic topic : geoObjects) {
                if (isGeoObjectTopic(topic)) {
                    results.add(new GeoObjectView(topic, geomapsService, angeboteService));
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
     * @param districtId
     * @param query
     */
    @GET
    @Path("/search/{districtId}")
    @Transactional
    public List<GeoObjectView> searchGeoObjectsFulltextInDistrict(@HeaderParam("Referer") String referer,
            @PathParam("districtId") long districtId, @QueryParam("search") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
            if (query.isEmpty()) {
                log.warning("No search term entered, returning empty resultset");
                return results;
            }
            List<Topic> geoObjects = searchFulltextInGeoObjectChilds(query);
            // iterate over merged results
            log.info("Start building response for " + geoObjects.size() + " and FILTER by DISTRICT");
            for (Topic geoObject: geoObjects) {
                // check for district
                if (hasRelatedBezirk(geoObject, districtId)) {
                    if (isGeoObjectTopic(geoObject)) {
                        results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
                    }
                }
            }
            log.info("Build up response " + results.size() + " geo objects in district=\""+districtId+"\"");
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics failed", e);
        }
    }

    /**
     * Fires searchTopic()-calls to find Geo Object topics by their:
     * <ul>
     *  <li>Geo Object Name</li>
     *  <li>Beschreibung Facet</li>
     *  <li>Stichworte Facet</li>
     *  <li>Bezirksregion Facet</li>
     * </ul>
     * @param query
     * @return A list of unique topics of type "ka2.geo_object".
     */
    @Override
    public List<Topic> searchFulltextInGeoObjectChilds(String query) {
        // ### Authenticate
        // ### Todo: Fetch for ka2.ansprechpartner, traeger name, too
        HashMap<Long, Topic> uniqueResults = new HashMap<Long, Topic>();
        List<Topic> searchResults = dm4.searchTopics(query, "ka2.geo_object.name");
        List<Topic> descrResults = dm4.searchTopics(query, "ka2.beschreibung");
        List<Topic> stichworteResults = dm4.searchTopics(query, "ka2.stichworte");
        // List<Topic> sonstigesResults = dm4.searchTopics(query, "ka2.sonstiges");
        List<Topic> bezirksregionResults = dm4.searchTopics(query, "ka2.bezirksregion"); // many
        // List<Topic> traegerNameResults = dm4.searchTopics(query, "ka2.traeger.name");
        // List<Topic> traegerNameResults = dm4.searchTopics(query, "dm4.contacts.street");
        log.info("> " + searchResults.size() + ", "+ descrResults.size() +", "+stichworteResults.size() + ", " + bezirksregionResults.size()
                + " results in four child types for query=\""+query+"\" in FULLTEXT");
        // merge all three types in search results
        searchResults.addAll(descrResults);
        searchResults.addAll(stichworteResults);
        // searchResults.addAll(sonstigesResults);
        searchResults.addAll(bezirksregionResults);
        // searchResults.addAll(traegerNameResults);
        // make search results only contain unique geo object topics
        log.info("Building up unique search resultset of fulltext search...");
        Iterator<Topic> iterator = searchResults.iterator();
        while (iterator.hasNext()) {
            Topic next = iterator.next();
            // ### may be "null" (check for Facets? relatio) of search child types
            Topic geoObject = null;
            if (next.getTypeUri().equals("ka2.bezirksregion")) {
                geoObject = getFirstParentGeoObjectTopic(next);
            } else if (next.getTypeUri().equals("ka2.geo_object.name") || next.getTypeUri().equals("ka2.stichworte")
                || next.getTypeUri().equals("ka2.beschreibung")) {
                geoObject = getParentGeoObjectTopic(next);
            }
            if (geoObject != null && !uniqueResults.containsKey(geoObject.getId())) {
                uniqueResults.put(geoObject.getId(), geoObject);
            }
        }
        log.info("searchResultLength=" + (searchResults.size()) + ", " + "uniqueResultLength=" + uniqueResults.size());
        return new ArrayList(uniqueResults.values());
    }

    // --- Bezirk Specific Resource Search, Overall, Listing

    @GET
    @Path("/bezirk")
    public List<BezirkInfo> getKiezatlasDistricts() {
        ArrayList<BezirkInfo> results = new ArrayList<BezirkInfo>();
        for (Topic bezirk : dm4.getTopicsByType("ka2.bezirk")) {
            results.add(new BezirkInfo(bezirk));
        }
        return results;
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
    public List<GeoObjectView> getGeoObjectsByDistrict(@HeaderParam("Referer") String referer, @PathParam("topicId") long bezirkId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        // use cache
        if (districtsCache.containsKey(bezirkId)) {
            // caching lifetime is 30 000 or 12 000 ms for testing purposes
            if (districtCachedAt.get(bezirkId) > new Date().getTime() - 21600000) { // 21600000 for approx. 6hr in ms
                log.info("Returning cached list of geo object for district " + bezirkId);
                return districtsCache.get(bezirkId);
            }
            // invalidate cache
            districtsCache.remove(bezirkId);
            districtCachedAt.remove(bezirkId);
        }
        // populate new resultset
        ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
        Topic bezirk = dm4.getTopic(bezirkId);
        List<RelatedTopic> geoObjects = bezirk.getRelatedTopics("dm4.core.aggregation",
            "dm4.core.child", "dm4.core.parent", "ka2.geo_object");
        for (RelatedTopic geoObject : geoObjects) {
            if (isGeoObjectTopic(geoObject)) {
                results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
            }
        }
        log.info("Populating cached list of geo object for district " + bezirkId);
        // insert new result into cache
        districtsCache.put(bezirkId, results);
        districtCachedAt.put(bezirkId, new Date().getTime());
        return results;
    }

    // --- Bezirksregionen Resources Listing

    @GET
    @Path("/bezirksregion")
    public List<Topic> getKiezatlasSubregions() {
        return dm4.getTopicsByType("ka2.bezirksregion");
    }

    @GET
    @Path("/bezirksregion/{topicId}")
    public List<GeoObjectView> getGeoObjectsBySubregions(@HeaderParam("Referer") String referer, @PathParam("topicId") long bezirksregionId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
        Topic bezirksregion = dm4.getTopic(bezirksregionId);
        List<RelatedTopic> geoObjects = bezirksregion.getRelatedTopics("dm4.core.aggregation",
            "dm4.core.child", "dm4.core.parent", "ka2.geo_object");
        for (RelatedTopic geoObject : geoObjects) {
            if (isGeoObjectTopic(geoObject)) {
                results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
            }
        }
        return results;
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

    // --- Utility Resources (Geo Coding and Reverse Geo Coding)

    private String geoCodeAddressInput(String addressValue) {
        String query = addressValue;
        String result = "";
        try {
            // Encoded url to open
            log.info("Requested geo code query=\"" + query + "\" - Processing");
            query = URLEncoder.encode(query, "UTF-8");
            String url = "http://maps.googleapis.com/maps/api/geocode/json?address="
                + query + "&sensor=false&locale=de";
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

    /**
     * Returns name for the given coordinate pair by (unauthenticated) asking Google Geocode API.
     * @param inputValue    String containing an URL encoded latitude longitude value pair.
     * @return
     */
    private String geoCodeLocationInput(String inputValue) {
        String result = "";
        try {
            String url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + inputValue + "&language=de";
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

    // ------------------------------------------------------------------------------------------------- Private Methods

    private void assignToWorkspace(DeepaMehtaObject object, long workspaceId) {
        if (object != null) {
            workspaceService.assignToWorkspace(object, workspaceId);
        }
    }

    private void privilegedAssignToWorkspace(DeepaMehtaObject object, long workspaceId) {
        if (object != null) {
            if (!hasWorkspaceAssignment(object)) {
                dm4.getAccessControl().assignToWorkspace(object, workspaceId);
            } else {
                Topic ws = workspaceService.getAssignedWorkspace(object.getId());
                log.info("Skipping privileged workspace assignment, "
                    + object.toString() + " already has a workspace wssignment to \"" + ws.getSimpleValue() + "\"");
            }
        }
    }

    private boolean hasWorkspaceAssignment(DeepaMehtaObject object) {
        return (workspaceService.getAssignedWorkspace(object.getId()) != null) ? true : false;
    }

    private boolean isConfirmationWorkspaceMember() {
        String username = acService.getUsername();
        if (username != null) {
            Topic workspace = getPrivilegedWorkspace();
            return (acService.isMember(username, workspace.getId()) || acService.getWorkspaceOwner(workspace.getId()).equals(username));
        } else {
            return false;
        }
    }

    /** private boolean isWorkspaceOwner(String username, long workspaceId) {
        return (dm4.getAccessControl().hasPermission(username, Operation.READ, workspaceId) && );
    } **/

    private boolean isAuthenticated() {
        return (acService.getUsername() != null);
    }

    /** Stores "Confirmed" topic on Geo Object into our "Confirmation" workspace.
    private void setConfirmationFlag(final Topic geoObject, final boolean value) {
        try {
            dm4.getAccessControl().runWithoutWorkspaceAssignment(new Callable<Topic>() {
                @Override
                public Topic call() {
                    // Assign all new "confirmed"-flag topics to our dedicated "Confirmation"-Workspace
                    geoObject.getChildTopics().set(CONFIRMED_TYPE, value);
                    dm4.getAccessControl().assignToWorkspace(geoObject.getChildTopics().getTopic(CONFIRMED_TYPE),
                        workspaceService.getWorkspace(CONFIRMATION_WS_URI).getId());
                    log.info("Assigned Geo Object: " + geoObject.getSimpleValue() + " to custom Workspace, confirmed=" + value);
                    return geoObject;
                }
            });
        } catch (Exception e) {
            throw new RuntimeException("Setting Geo Object Confirmation Flag failed", e);
        }
    } **/

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
        facetsService.updateFacet(address, "dm4.geomaps.geo_coordinate_facet", value);
        // ## Do WS Assignment here, too.
    }

    private void updateSimpleCompositeFacet(Topic geoObject, String facetTypeUri, String childTypeUri, String value) {
        Topic oldFacetTopic = facetsService.getFacet(geoObject.getId(), facetTypeUri);
        if (!value.trim().isEmpty()) {
            facetsService.updateFacet(geoObject.getId(), facetTypeUri, mf.newFacetValueModel(childTypeUri).put(value.trim()));
            if (oldFacetTopic != null) oldFacetTopic.delete();
            initiallyAssignSingleRelatingFacetToWorkspace(geoObject, facetTypeUri, getStandardWorkspace().getId());
        }
    }

    private void writeSimpleKeyCompositeFacet(Topic geoObject, String facetTypeUri, String childTypeUri, String value) {
        // check if a former value was already assigned and we're updating
        Topic oldFacetTopic = facetsService.getFacet(geoObject.getId(), facetTypeUri);
        // check if value already exist in a topic/db and if so, reference that
        Topic keyTopic = dm4.getTopicByValue(childTypeUri, new SimpleValue(value.trim()));
        if (!value.trim().isEmpty()) {
            if (oldFacetTopic != null && !oldFacetTopic.getSimpleValue().toString().equals(value.trim())) {
                // old value is existent and same as new value, do nothing
            } else if (keyTopic != null) { // reference existing topic
                facetsService.updateFacet(geoObject.getId(), facetTypeUri,
                    mf.newFacetValueModel(childTypeUri).putRef(keyTopic.getId()));
            } else { // create new topic with new value
                facetsService.updateFacet(geoObject.getId(), facetTypeUri,
                    mf.newFacetValueModel(childTypeUri).put(value.trim()));
                initiallyAssignSingleRelatingFacetToWorkspace(keyTopic, facetTypeUri, getStandardWorkspace().getId());
            }
        }
    }

    private void initiallyAssignSingleRelatingFacetToWorkspace(Topic object, String facetTypeUri, long workspaceId) {
        // ## Handle multi AND single-facets
        // ## Iterate over all facet value topic childs and assign them too
        Topic facetTopicValue = facetsService.getFacet(object, facetTypeUri);
        privilegedAssignToWorkspace(facetTopicValue, workspaceId);
        Association facetAssoc = dm4.getAssociation("dm4.core.composition", object.getId(), facetTopicValue.getId(), null, null);
        privilegedAssignToWorkspace(facetAssoc, workspaceId);
        log.info("Assigned \""+facetTypeUri+"\" Facet Topic Value : " + facetTopicValue.getId() + " to Workspace incl. relating Association");
    }
    
    private void writeBezirksFacet(Topic geoObject, long bezirksTopicId) {
        if (bezirksTopicId > -1) {
            facetsService.updateFacet(geoObject.getId(), WebsiteService.BEZIRK_FACET,
                mf.newFacetValueModel(WebsiteService.BEZIRK).putRef(bezirksTopicId));
        }
    }

    private void delFacetTopicReferences(Topic geoObject, List<RelatedTopic> topics, String facetTypeUri, String childTypeUri) {
        for (Topic topic : topics) {
            facetsService.updateFacet(geoObject, facetTypeUri,
                mf.newFacetValueModel(childTypeUri).addDeletionRef(topic.getId()));
        }
    }

    private void putFacetTopicsReferences(Topic geoObject, List<Long> ids, String facetTypeUri, String childTypeUri) {
        for (Long id : ids) {
            facetsService.updateFacet(geoObject.getId(), facetTypeUri, mf.newFacetValueModel(childTypeUri).addRef(id));
        }
    }

    private void attachGeoObjectChildTopics(final Topic geoObject, final String ansprechpartner, final String telefon,
            final String fax, final String email, final String beschreibung, final String oeffnungszeiten,
            final String website, final String coordinatePair, final long district, final List<Long> themen,
            final List<Long> zielgruppen, final List<Long> angebote) {
        try {
            dm4.getAccessControl().runWithoutWorkspaceAssignment(new Callable<Topic>() {
                @Override
                public Topic call() {
                    // Store Geo Coordinate
                    writeGeoCoordinateFacet(geoObject.getChildTopics().getTopic("dm4.contacts.address"), coordinatePair);
                    // Assign the composite contact and two new simple HTML facets
                    updateContactFacet(geoObject, ansprechpartner, telefon, email, fax);
                    // Both new facet value topics will be assigned to Standard Workspace by default, old is removed
                    updateSimpleCompositeFacet(geoObject, BESCHREIBUNG_FACET, BESCHREIBUNG, beschreibung);
                    updateSimpleCompositeFacet(geoObject, OEFFNUNGSZEITEN_FACET, OEFFNUNGSZEITEN, oeffnungszeiten);
                    // Assign existing Bezirks Topic, Create, Update or Re-use existing Webpage URL and Assign
                    writeBezirksFacet(geoObject, district);
                    // All new webbrowser url topics will be assign to Standard Workspace
                    writeSimpleKeyCompositeFacet(geoObject, WEBSITE_FACET, "dm4.webbrowser.url", website);
                    // Handle Category Relations
                    updateCriteriaFacets(geoObject, themen, zielgruppen, angebote);
                    return null;
                }
            });
        } catch (Exception ex) {
            Logger.getLogger(WebsitePlugin.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    private Topic createUnconfirmedGeoObject(final TopicModel geoObjectModel) {
        try {
            return dm4.getAccessControl().runWithoutWorkspaceAssignment(new Callable<Topic>() {
                @Override
                public Topic call() {
                    Topic geoObject = dm4.createTopic(geoObjectModel);
                    RelatedTopic address = geoObject.getChildTopics().getTopic("dm4.contacts.address");
                    RelatedTopic street = address.getChildTopics().getTopic("dm4.contacts.street");
                    RelatedTopic city = address.getChildTopics().getTopic("dm4.contacts.city");
                    RelatedTopic zipCode = address.getChildTopics().getTopic("dm4.contacts.postal_code");
                    RelatedTopic country = address.getChildTopics().getTopic("dm4.contacts.country");
                    long workspaceId = getPrivilegedWorkspace().getId();
                    privilegedAssignToWorkspace(geoObject, workspaceId);
                    privilegedAssignToWorkspace(address, workspaceId);
                    privilegedAssignToWorkspace(address.getRelatingAssociation(), workspaceId);
                    privilegedAssignToWorkspace(street, workspaceId);
                    privilegedAssignToWorkspace(street.getRelatingAssociation(), workspaceId);
                    privilegedAssignToWorkspace(city, workspaceId);
                    privilegedAssignToWorkspace(city.getRelatingAssociation(), workspaceId);
                    privilegedAssignToWorkspace(zipCode, workspaceId);
                    privilegedAssignToWorkspace(zipCode.getRelatingAssociation(), workspaceId);
                    privilegedAssignToWorkspace(country, workspaceId);
                    privilegedAssignToWorkspace(country.getRelatingAssociation(), workspaceId);
                    log.info("Created Unconfirmed Geo Object ("+geoObject.getSimpleValue()+") in Confirmation WS");
                    return geoObject;
                }
            });
        } catch (Exception e) {
            throw new RuntimeException("Creating User Assignment to Geo Object FAILED", e);
        }
    }

    private Association createUserAssignment(final Topic geoObject, final String username) {
        final Topic usernameTopic = acService.getUsernameTopic(username);
        if (!isAssignedUsername(geoObject, usernameTopic)) {
            try {
                return dm4.getAccessControl().runWithoutWorkspaceAssignment(new Callable<Association>() {
                    @Override
                    public Association call() {
                        // Assign all new "confirmed"-flag topics to our dedicated "Confirmation"-Workspace
                        Association assignment = dm4.createAssociation(mf.newAssociationModel("de.kiezatlas.user_assignment",
                            mf.newTopicRoleModel(geoObject.getId(), "dm4.core.default"),
                            mf.newTopicRoleModel(usernameTopic.getId(), "dm4.core.default")));
                        // ### Workspace Selection Either OR ...
                        privilegedAssignToWorkspace(assignment, getPrivilegedWorkspace().getId());
                        log.info("Created User Assignment ("+username+") for Geo Object \"" + geoObject.getSimpleValue() + "\" in Confirmation WS");
                        return assignment;
                    }
                });
            } catch (Exception e) {
                throw new RuntimeException("Creating User Assignment to Geo Object FAILED", e);
            }
        }
        return null;
    }

    private Association createBildAssignment(final Topic geoObject, final Topic username, final long fileTopicId) {
        final Topic usernameTopic = username;
        if (isAssignedUsername(geoObject, usernameTopic)) { // check if this is alraedy allowed...
            try {
                return dm4.getAccessControl().runWithoutWorkspaceAssignment(new Callable<Association>() {
                    @Override
                    public Association call() {
                        // Create a geo object <-> file topic relation
                        Association assignment = dm4.createAssociation(mf.newAssociationModel("de.kiezatlas.bild_assignment",
                            mf.newTopicRoleModel(geoObject.getId(), "dm4.core.default"),
                            mf.newTopicRoleModel(fileTopicId, "dm4.core.default")));
                        // ### Workspace Selection Either OR ...
                        log.info("Created Bild Assignment ("+username+") for Geo Object \"" + geoObject.getSimpleValue()
                            + "\" and File Topic \""+fileService.getFile(fileTopicId).toString()+"\"");
                        privilegedAssignToWorkspace(assignment, getStandardWorkspace().getId());
                        return assignment;
                    }
                });
            } catch (Exception e) {
                throw new RuntimeException("Creating User Assignment to Geo Object FAILED", e);
            }
        }
        return null;
    }

    private String getFirstUsernameAssigned(Topic geoObject) {
        List<RelatedTopic> assignments = getAssignedUsernameTopics(geoObject);
        for (RelatedTopic assignedUsername : assignments) {
            return assignedUsername.getSimpleValue().toString();
        }
        return null;
    }

    private List<RelatedTopic> getAssignedUsernameTopics(Topic topic) {
        return topic.getRelatedTopics("de.kiezatlas.user_assignment",
            "dm4.core.default", "dm4.core.default", null);
    }

    private boolean isAssignedUsername(Topic topic, Topic username) {
        if (username == null) return false;
        List<RelatedTopic> assignments = getAssignedUsernameTopics(topic);
        for (RelatedTopic assignedUsername : assignments) {
            if (assignedUsername.getSimpleValue().equals(username.getSimpleValue())) return true;
        }
        return false;
    }

    private Topic getParentGeoObjectTopic(Topic entry) {
        Topic result = entry.getRelatedTopic(null, "dm4.core.child", "dm4.core.parent", KiezatlasService.GEO_OBJECT);
        if (result == null) log.warning("Search Result Entry: " +entry.getTypeUri()
            + ", " +entry.getId() +" has no Geo Object as PARENT"); // fulltext searches also "abandoned" facet topics
        return result;
    }

    private Topic getFirstParentGeoObjectTopic(Topic entry) {
        List<RelatedTopic> results = entry.getRelatedTopics("dm4.core.aggregation", "dm4.core.child",
            "dm4.core.parent", KiezatlasService.GEO_OBJECT);
        if (results == null) log.warning("Search Result Entry: " +entry.getTypeUri()
            + ", " +entry.getId() +" has NOT ONE Geo Object as PARENT");  // fulltext-search incl. "abandoned" facets
        return (results.size() > 0 ) ? results.get(0) : null;
    }

    private Topic getRelatedBezirk(Topic geoObject) {
        return geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent", "dm4.core.child", "ka2.bezirk");
    }

    private boolean hasRelatedBezirk(Topic geoObject, long bezirksId) {
        Topic relatedBezirk = getRelatedBezirk(geoObject);
        if (relatedBezirk == null) return false;
        if (relatedBezirk.getId() == bezirksId) return true;
        return false;
    }

    private boolean isGeoObjectTopic(Topic geoObject) {
        // ### Checking for typeuri AND Confirmed flagmay be redundant
        return geoObject != null && geoObject.getTypeUri().equals(KiezatlasService.GEO_OBJECT);
            // && geoObject.getChildTopics().getBoolean(CONFIRMED_TYPE);
    }

    private boolean isGeoObjectEditable(Topic geoObject, Topic username) {
        return isAssignedUsername(geoObject, username) && isKiezatlas2GeoObject(geoObject);
    }

    private boolean isKiezatlas2GeoObject(Topic geoObject) {
        return !(geoObject.getUri().startsWith(KA1_GEO_OBJECT_URI_PREFIX));
    }

    private boolean isValidReferer(String ref) {
        if (ref == null) return false;
        if (ref.contains(".kiezatlas.de/") || ref.contains("localhost")) {
            return true;
        } else {
            return false;
        }
    }

    private EinrichtungsInfo assembleGeneralEinrichtungsInfo(Topic geoObject) {
        EinrichtungsInfo einrichtung = new EinrichtungsInfo();
        try {
            geoObject.loadChildTopics();
            einrichtung.setName(geoObject.getChildTopics().getString(KiezatlasService.GEO_OBJECT_NAME));
            // Sets Street, Postal Code, City and Address
            Topic addressTopic = geoObject.getChildTopics().getTopic(KiezatlasService.GEO_OBJECT_ADDRESS);
            einrichtung.setAddress(addressTopic);
            // Sets Latitude and Longitude
            GeoCoordinate geoCoordinate = geomapsService.getGeoCoordinate(addressTopic);
            einrichtung.setCoordinates(geoCoordinate);
            // Sets Kontakt Facet
            Topic kontakt = facetsService.getFacet(geoObject, KONTAKT_FACET);
            if (kontakt != null) {
                kontakt.loadChildTopics();
                einrichtung.setEmail(kontakt.getChildTopics().getString(KONTAKT_MAIL));
                einrichtung.setFax(kontakt.getChildTopics().getString(KONTAKT_FAX));
                einrichtung.setTelefon(kontakt.getChildTopics().getString(KONTAKT_TEL));
                einrichtung.setAnsprechpartner(kontakt.getChildTopics().getString(KONTAKT_ANSPRECHPARTNER));
            }
            // Calculates Imprint Value
            Topic bezirk = getRelatedBezirk(geoObject);
            if (bezirk == null) {
                log.warning("No BEZIRK assigned to Geo Object!");
                log.warning("EinrichtungsInfos Bezirk has NO IMPRINT value set, ID:" + geoObject.getId());
                einrichtung.setImprintUrl("http://pax.spinnenwerk.de/~kiezatlas/index.php?id=6");
            } else {
                einrichtung.setBezirk(bezirk.getSimpleValue().toString());
                einrichtung.setBezirkId(bezirk.getId());
                BezirkInfo bezirkInfo = new BezirkInfo(bezirk);
                if (bezirkInfo.getImprintLink() != null) {
                    einrichtung.setImprintUrl(bezirkInfo.getImprintLink().getSimpleValue().toString());
                }
            }
            // Last Modified
            einrichtung.setLastModified((Long) dm4.getProperty(geoObject.getId(), "dm4.time.modified"));
            // Image Path
            Topic imagePath = kiezatlas.getImageFileFacetByGeoObject(geoObject);
            if (imagePath != null) einrichtung.setImageUrl(imagePath.getSimpleValue().toString());
            // Öffnungszeiten Facet
            Topic offnung = facetsService.getFacet(geoObject, OEFFNUNGSZEITEN_FACET);
            if (offnung != null) einrichtung.setOeffnungszeiten(offnung.getSimpleValue().toString());
            // Beschreibung Facet
            Topic beschreibung = facetsService.getFacet(geoObject, BESCHREIBUNG_FACET);
            if (beschreibung != null) einrichtung.setBeschreibung(beschreibung.getSimpleValue().toString());
            // Stichworte Facet
            Topic stichworte = facetsService.getFacet(geoObject, STICHWORTE_FACET);
            if (stichworte != null) einrichtung.setStichworte(stichworte.getSimpleValue().toString());
            // LOR Nummer Facet
            Topic lor = facetsService.getFacet(geoObject, LOR_FACET);
            if (lor != null) einrichtung.setLORId(lor.getSimpleValue().toString());
            // Website Facet
            Topic website = facetsService.getFacet(geoObject, WEBSITE_FACET);
            if (website != null) einrichtung.setWebpage(website.getSimpleValue().toString());
            einrichtung.setId(geoObject.getId());
        } catch (Exception ex) {
            throw new RuntimeException("Could not assemble EinrichtungsInfo", ex);
        }
        return einrichtung;
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

    private Topic getAssignedWorkspace(Topic geoObject) {
        return workspaceService.getAssignedWorkspace(geoObject.getId());
    }

    private Topic getStandardWorkspace() {
        return workspaceService.getWorkspace(workspaceService.DEEPAMEHTA_WORKSPACE_URI);
    }

    private Topic getPrivilegedWorkspace() {
        return dm4.getAccessControl().getWorkspace(CONFIRMATION_WS_URI);
    }

    private Topic getUsernameTopic() {
        String username = acService.getUsername();
        if (username != null && !username.isEmpty()) {
            return acService.getUsernameTopic(username);
        } else {
            return null;
        }
    }

    private List<Topic> getAngebotCriteriaTopics() {
        return sortAlphabeticalDescending(dm4.getTopicsByType("ka2.criteria.angebot"));
    }

    private List<Topic> getThemaCriteriaTopics() {
        return sortAlphabeticalDescending(dm4.getTopicsByType("ka2.criteria.thema"));
    }

    private List<Topic> getZielgruppeCriteriaTopics() {
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

    private List<Topic> getAvailableDistrictTopics() {
        List<Topic> topics = dm4.getTopicsByType("ka2.bezirk");
        List<Topic> results = topics;
        sortAlphabeticalDescending(results);
        return results;
    }

    private List<Topic> sortAlphabeticalDescending(List<Topic> topics) {
        Collections.sort(topics, new Comparator<Topic>() {
            public int compare(Topic t1, Topic t2) {
                String one = t1.getSimpleValue().toString();
                String two = t2.getSimpleValue().toString();
                return one.compareTo(two);
            }
        });
        return topics;
    }

    private void sortAlphabeticalDescendingByChildTopic(List<Topic> topics, final String childTypeUri) {
        Collections.sort(topics, new Comparator<Topic>() {
            public int compare(Topic t1, Topic t2) {
                t1.loadChildTopics(childTypeUri);
                t2.loadChildTopics(childTypeUri);
                String one = t1.getChildTopics().getString(childTypeUri);
                String two = t2.getChildTopics().getString(childTypeUri);
                return one.compareTo(two);
            }
        });
    }

    private void sortByModificationDateDescending(List<RelatedTopic> topics) {
        Collections.sort(topics, new Comparator<Topic>() {
            public int compare(Topic t1, Topic t2) {
                long one = (Long) t1.getProperty("dm4.time.modified");
                long two = (Long) t2.getProperty("dm4.time.modified");
                if (one > two) return -1;
                if (two > one) return 1;
                return 0;
            }
        });
    }

    private void prepareFormWithAvailableTopics() {
        viewData("availableCities", getAvailableCityTopics());
        viewData("availableDistricts", getAvailableDistrictTopics());
        viewData("availableCountries", getAvailableCountryTopics());
        viewData("availableThemen", getThemaCriteriaTopics());
        viewData("availableTraeger", getAvailableTraegerTopics());
        viewData("availableLor", getAvailableLORNumberTopics());
        // viewData("availableAngebote", getAngebotCriteriaTopics());
        viewData("availableZielgruppen", getZielgruppeCriteriaTopics());
        log.info("> Prepare Form Template with available Topics");
    }

    private void preparePageAuthorization() {
        boolean isAuthenticated = isAuthenticated();
        boolean isPrivileged = isConfirmationWorkspaceMember();
        viewData("authenticated", isAuthenticated);
        viewData("is_publisher", isPrivileged);
        log.info("Checking Authorization (isPrivileged=" + isPrivileged + ", isAuthenticated=" + isAuthenticated() + ")");
    }

    private void updateCriteriaFacets(Topic geoObject, List<Long> themen, List<Long> zielgruppen, List<Long> angebote) {
        List<RelatedTopic> formerThemen = facetsService.getFacets(geoObject, THEMA_FACET);
        List<RelatedTopic> formerZielgruppen = facetsService.getFacets(geoObject, ZIELGRUPPE_FACET);
        // List<RelatedTopic> formerAngebote = facetsService.getFacets(geoObject, ANGEBOT_FACET);
        delFacetTopicReferences(geoObject, formerThemen, THEMA_FACET, THEMA_CRIT);
        delFacetTopicReferences(geoObject, formerZielgruppen, ZIELGRUPPE_FACET, ZIELGRUPPE_CRIT);
        /// delRefFacetTopics(geoObject, formerAngebote, ANGEBOT_FACET, ANGEBOT_CRIT);
        putFacetTopicsReferences(geoObject, themen, THEMA_FACET, THEMA_CRIT);
        putFacetTopicsReferences(geoObject, zielgruppen, ZIELGRUPPE_FACET, ZIELGRUPPE_CRIT);
        // putRefFacets(geoObject, angebote, ANGEBOT_FACET, ANGEBOT_CRIT);
    }

    private void updateContactFacet(Topic geoObject, String ansprechpartner, String telefon, String email, String fax) {
        Topic kontakt = facetsService.getFacet(geoObject, KONTAKT_FACET);
        if (kontakt == null) { // Create
            FacetValueModel facetValue = mf.newFacetValueModel(KONTAKT);
            facetValue.put(mf.newChildTopicsModel()
                .put(KONTAKT_ANSPRECHPARTNER, ansprechpartner.trim())
                .put(KONTAKT_MAIL, email.trim())
                .put(KONTAKT_TEL, telefon.trim())
                .put(KONTAKT_FAX, fax.trim())
            );
            facetsService.updateFacet(geoObject, KONTAKT_FACET, facetValue);
        } else { // Update through Overwrite
            kontakt.getChildTopics().set(KONTAKT_ANSPRECHPARTNER, ansprechpartner.trim());
            kontakt.getChildTopics().set(KONTAKT_MAIL, email.trim());
            kontakt.getChildTopics().set(KONTAKT_TEL, telefon.trim());
            kontakt.getChildTopics().set(KONTAKT_FAX, fax.trim());
        }
    }

    private Viewable getPageNotFound() {
        return getPageNotFound(null, null);
    }

    private Viewable getPageNotFound(String message) {
        return getPageNotFound(message, null);
    }

    private Viewable getPageNotFound(String message, String backLinkUrl) {
        if (message != null) viewData("message", message);
        if (backLinkUrl != null) viewData("originated", backLinkUrl);
        return view("404");
    }

    private Viewable getUnauthorizedPage() {
        return getUnauthorizedPage(null, null);
    }

    private Viewable getUnauthorizedPage(String message) {
        return getUnauthorizedPage(message, null);
    }

    private Viewable getUnauthorizedPage(String message, String backLinkUrl) {
        if (message != null) viewData("message", message);
        if (backLinkUrl != null) viewData("originated", backLinkUrl);
        return view("401");
    }

    private long mapGoogleDistrictNameToKiezatlasBezirksTopic(String googleDistrict) {
        List<Topic> districts = getAvailableDistrictTopics();
        for (Topic district : districts) {
            if (district.getSimpleValue().toString().equals(googleDistrict)) return district.getId();
            if (googleDistrict.contains(district.getSimpleValue().toString())) return district.getId();
        }
        return -1;
    }

}
