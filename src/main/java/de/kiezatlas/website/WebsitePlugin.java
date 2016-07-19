package de.kiezatlas.website;

import de.kiezatlas.website.model.NewsFeedItem;
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
import de.kiezatlas.angebote.AngebotAssignedListener;
import de.kiezatlas.angebote.AngebotService;
import static de.kiezatlas.angebote.AngebotService.ANGEBOT_BESCHREIBUNG;
import de.kiezatlas.angebote.model.AngebotsinfosAssigned;
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
import de.kiezatlas.website.model.StreetCoordinates;
import de.mikromedia.webpages.WebpageService;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.StringReader;
import java.io.UnsupportedEncodingException;
import java.math.RoundingMode;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLEncoder;
import java.net.UnknownHostException;
import java.text.DateFormat;
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
import javax.ws.rs.core.Response.Status;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;
import org.deepamehta.plugins.signup.SignupPlugin;
import org.deepamehta.plugins.signup.service.SignupPluginService;
import org.w3c.dom.CharacterData;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

/**
 * The module bundling the Kiezatlas 2 Website.<br/>
 * Based on dm47-kiezatlas-2.1.7-SNAPSHOT, dm47-kiezatlas-etl-0.2.1-SNAPSHOT and dm47-webpages-0.3.<br/>
 * Compatible with DeepaMehta 4.7
 * <a href="http://github.com/mukil/dm4-kiezatlas-website">Source Code</a>
 *
 * @author Malte Reißig (<a href="mailto:malte@mikromedia.de">Contact</a>)
 * @version 0.4-SNAPSHOT
 */
@Path("/geoobject")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class WebsitePlugin extends ThymeleafPlugin implements WebsiteService, AngebotAssignedListener {

    private final Logger log = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaces;
    @Inject private AccessControlService accesscl;
    @Inject private WebpageService webpages;
    @Inject private GeospatialService geospatial;
    @Inject private AngebotService angebote;
    @Inject private SignupPluginService signup;
    @Inject private GeomapsService geomaps;
    @Inject private FacetsService facets;
    @Inject private FilesService files;
    @Inject private KiezatlasService kiezatlas;

    // Application Cache of District Overview Resultsets
    HashMap<Long, List<GeoObjectView>> districtsCache = new HashMap<Long, List<GeoObjectView>>();
    HashMap<Long, Long> districtCachedAt = new HashMap<Long, Long>();

    // The URIs of KA2 Geo Object topics synchronized (and kept up-to-date in) Kiezatlas 1 have this prefix.
    // The remaining part of the URI is the original KA1 topic id.
    private static final String KA1_GEO_OBJECT_URI_PREFIX = "de.kiezatlas.topic.";
    private DateFormat df = DateFormat.getDateInstance(DateFormat.LONG, Locale.GERMANY);

    @Override
    public void init() {
        initTemplateEngine(); // initting a thymeleaf template engine for this bundle specifically too
    }

    @Override
    public void serviceArrived(Object service) {
        if (service instanceof WebpageService) {
            log.info("Announcing our Website Bundle as additional template resource at Webpages TemplateEngines");
            webpages.addTemplateResolverBundle(bundle);
            webpages.overrideFrontpageTemplate("ka-index");
            webpages.reinitTemplateEngine();
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

    /** Responds witha a Viewable,the frontpage of the Kiezatlas Website. */
    @GET
    @Produces(MediaType.TEXT_HTML)
    public Viewable getWebsite() {
        return getFrontpageView();
    }

    @GET
    @Path("/menu")
    @Produces(MediaType.TEXT_HTML)
    public Viewable getWebsiteMenu() throws URISyntaxException {
        // if (!isAuthenticated()) return getUnauthorizedPage();
        // if (!isConfirmationWorkspaceMember()) throw new WebApplicationException(Response.temporaryRedirect(new URI("/angebote/my")).build());
        prepareGeneralPageData("user");
        return view("user");
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
        return getConfirmationView(results);
    }

    /**
     * Builds up a form for introducing a NEW Kiezatlas Einrichtung (Geo Object).
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/create")
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
        prepareGeneralPageData("edit");
        viewData("workspace", getPrivilegedWorkspace());
        return view("edit");
    }

    /**
     * Processes the form for creating a Kiezatlas Einrichtung in a specific Workspace.
     */
    @POST
    @Produces(MediaType.TEXT_HTML)
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Path("/save")
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
        Topic username = getUsernameTopic();
        String coordinatePair = "", geoLocation = "";
        if (district == -1 && !googleDistrict.isEmpty()) { // no district selected, trying magic
            district = mapGoogleDistrictNameToKiezatlasBezirksTopic(googleDistrict);
            if (district == -1) log.warning("> Automatisches Mapping des Bezirks für Einrichtung ist FEHLGESCHLAGEN.");
            if (district > 0) log.info("> Automatisches Mapping des Bezirks für Einrichtung war ERFOLGREICH, ID: " + district);
        } else if (district == -1 && googleDistrict.isEmpty()) {
            viewData("message", "Bitte w&auml;hlen Sie den passenden Bezirk f&uuml;r diese Einrichtung aus");
            // ### Test this route
            return (topicId == -1 || topicId == 0) ? getGeoObjectEditPage() : getGeoObjectEditPage(topicId);
        }
        // Handle Geo Coordinates of Geo Object
        if (latitude == -1000 || longitude == -1000) {
            geoLocation = geoCodeAddressInput(URLEncoder.encode(strasse + ", " + plz + " " + city));
            coordinatePair = parseFirstCoordinatePair(geoLocation);
            log.info("> Reset Geo Coordinates by Street, Postal Code, City Value to \"" + coordinatePair + "\"");
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
        if (topicId == -1 || topicId == 0) {
            try {
                log.info("// ---------- CREATing Einrichtung " + name + " ---------------------- // ");
                // ------------ Assign Geo Object Basics to the topic of getPrivilegedWorkspace() ------------------ //
                // Saving Address needs "dm4_no_geocoding=true" Cookie, otherwise it geo-codes automatically
                geoObject = createGeoObjectWithoutWorkspace(mf.newTopicModel("ka2.geo_object", geoObjectTopicModel),
                    geoObject, ansprechpartner, telefon, fax, email, beschreibung, oeffnungszeiten, website,
                    coordinatePair, district, themen, zielgruppen, angebote);
                Association assignment = createUserAssignment(geoObject, accesscl.getUsername());
                privilegedAssignToWorkspace(assignment, getPrivilegedWorkspace().getId());
                // Handles Image-File Upload (Seperately)
                if (fileId != 0) {
                    log.info("> Bild File Topic Upload is file at=\"" + files.getFile(fileId).toString());
                    createBildAssignment(geoObject, username, fileId);
                }
                initiallyAssignGeoObjectFacetsToWorkspace(geoObject, getPrivilegedWorkspace());
                // Assign Geo Object to Confirmation WS (at last, otherwise we could not write its facets)
                initiallyAssignGeoObjecToWorkspace(geoObject, getPrivilegedWorkspace());
                // ### Send Notification to EDITOR with basic infos on the "confirmation" process
                // Note: If notification fails, confirmation fails too
                sendAdministrationNotice("Neuer Einrichtungsdatensatz im Kiezatlas", geoObject, username);
                viewData("message", "Vielen Dank, Sie haben erfolgreich einen neuen Ort in den Kiezatlas eingetragen. "
                    + "Die Kiez-AdministratorInnen wurden benachrichtigt und wir werden Ihren Eintrag so schnell wie m&ouml;glich freischalten.");
                log.info("// ---------- Es wurde erfolgreiche eine neue Einrichtung im Kiezatlas ANGELEGT (" + name + ")");
            } catch (Exception ex) {
                // If a geoObject was already created assign it to a workspace (otherwise we can not easily delete it).
                // if (geoObject != null) assignGeoObjecToWorkspace(geoObject, getPrivilegedWorkspace());
                throw new WebApplicationException(ex.getCause(), Status.INTERNAL_SERVER_ERROR);
            }
        } else {
            log.info("// ---------- UPDATing Einrichtung " + name + " (TopicID: " + topicId + ") -------------- // ");
            geoObject = dm4.getTopic(topicId);
            if (isGeoObjectEditable(geoObject, username)) {
                // the following should create new street, postal code, city and country topics (which is not what we want)
                geoObject.setChildTopics(geoObjectTopicModel);
                attachGeoObjectChildTopics(geoObject, ansprechpartner, telefon, fax, email, beschreibung,
                    oeffnungszeiten, website, coordinatePair, district, themen, zielgruppen, angebote);
            } else {
                viewData("message", "Sie sind aktuell leider nicht berechtigt diesen Datensatz zu bearbeiten.");
                return getUnauthorizedPage();
            }
        }
        log.info("#### Saved Geo Object Form #### " + geoObject.getId());
        viewData("name", geoObject.getSimpleValue().toString());
        viewData("coordinates", coordinatePair);
        return getSimpleMessagePage();
    }

    /** ---------------------------------------------------------------- Kiezatlas Notification Mechanics ---------- */

    @Override
    public void angebotsInfoAssigned(Topic angebotsInfo, Topic geoObject, Association assignmentEdge) {
        log.info("Website listening to \"" + angebotsInfo.getSimpleValue() + "\" being assigned to \"" + geoObject.getSimpleValue() + "\" as a NEW ANGEBOT");
        // ### use sendUserMailboxNotification and include Einrichtungs-Inhaberin..
        Topic contactFacet = getFacettedContactChildTopic(geoObject);
        String eMailAddress = getAnsprechpartnerMailboxValue(contactFacet);
        String recipients = "malte@mikromedia.de; ";
        if (eMailAddress != null && !eMailAddress.isEmpty()) {
            log.info("Angebotsinfo Assignment Notification \"" + eMailAddress.toString() + "\" (cushioned=using malte@)");
            recipients += "support@kiezatlas.de";
        } else {
            log.info("Angebotsinfo Assignment Notification to NO MAILBOX using System Mailbox Configuration topic"
                + "(resp. support@kiezatlas.de)");
            recipients += "support@kiezatlas.de";
        }
        String key = UUID.randomUUID().toString();
        assignmentEdge.setProperty("revision_key", key, false);
        String message = "Falls dieses Angebot nicht an ihrer Einrichtung stattfindet bzw. nicht stattfinden soll, "
            + "nutzen Sie bitte auf der folgenden Seite die Funktion zur Aufhebung dieser terminlichen Zuordnung:\n"
            + SignupPlugin.DM4_HOST_URL + "angebote/revise/" + key + "/" + assignmentEdge.getId() ;
        long startTime = angebote.getAssignmentStartTime(assignmentEdge);
        long endTime = angebote.getAssignmentEndTime(assignmentEdge);
        StringBuilder mailBody = new StringBuilder();
        mailBody.append("\nName des Angebots: " + angebotsInfo.getSimpleValue().toString());
        String standardBeschreibung = angebotsInfo.getChildTopics().getStringOrNull(ANGEBOT_BESCHREIBUNG);
        if (standardBeschreibung != null) mailBody.append("\nAngebotsbeschreibung:\n" + angebotsInfo.getSimpleValue().toString());
        mailBody.append("\nFür den Zeitraum vom " + df.format(startTime) + " bis zum " + df.format(endTime));
        mailBody.append("\nEinrichtung: " + geoObject.getSimpleValue().toString() + "\n\n" + message + "\n\n");
        mailBody.append("Vielen Dank!");
        signup.sendUserMailboxNotification(recipients, "Neue Angebotsinfos ihrer Einrichtung zugewiesen", mailBody.toString());
    }

    private void sendConfirmationNotice(List<String> mailboxes, Topic geoObject) {
        String recipients = "";
        int recipientCount = 1;
        for (String mailbox : mailboxes) {
            recipients += mailbox;
            if (recipientCount < mailboxes.size()) recipients += ";";
        }
        signup.sendUserMailboxNotification(recipients, "Der Kiezatlas Eintrag wurde freigeschaltet", "\nLiebe_r KiezAtlas Nutzer_in,\n\n"
            + "dein Eintrag wurde soeben bestätigt.\n\n"
            + "Name des Eintrags: \"" + geoObject.getSimpleValue().toString() + "\"\n"
            + "Link: " + SignupPlugin.DM4_HOST_URL+"/geoobject/" + geoObject.getId() + "\n\nOk, vielen Dank für deine Mithilfe.\n\nCiao!");
    }

    private void sendAdministrationNotice(String subject, Topic geoObject, Topic username) {
        // ### use sendUserMailboxNotification and include Kiez-Administrator..
        signup.sendSystemMailboxNotification(subject, "\nLiebe/r Kiez-Administrator_in,\n\n"
            + "es gibt einen neuen Einrichtungsdatensatz von "+username+", bitte schaue gleich mal ob Du diesen nicht gleich freischalten kannst.\n\n"
            + "Name des neuen Eintrags: \"" + geoObject.getSimpleValue().toString() + "\"\n"
            + "Der Link zur Freischaltung: "+SignupPlugin.DM4_HOST_URL+"/geoobject/" + geoObject.getId() + " bzw. zum Login ist:\n"
            + SignupPlugin.DM4_HOST_URL + "/sign-up/login\n\nOk, das war's schon.\n\nDanke + Ciao!");
    }

    /**
     * Builds up a form for editing a Kiezatlas Einrichtung.
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/edit/{topicId}")
    public Viewable getGeoObjectEditPage(@PathParam("topicId") long topicId) {
        // ### Handle the case if user cannot edit anymore (just see) directly after confirmation.
        Topic geoObject = dm4.getTopic(topicId);
        if (!isAuthenticated()) return getUnauthorizedPage();
        Topic username = getUsernameTopic();
        if (isGeoObjectTopic(geoObject)) {
            if (isAssignedUsername(geoObject, username)) {
                EinrichtungsInfo einrichtung = assembleGeneralEinrichtungsInfo(geoObject);
                einrichtung.setAssignedUsername(username.getSimpleValue().toString());
                viewData("geoobject", einrichtung);
                viewData("themen", facets.getFacets(geoObject, THEMA_FACET));
                viewData("zielgruppen", facets.getFacets(geoObject, ZIELGRUPPE_FACET));
                // viewData("angebote", facetsService.getFacets(geoObject, ANGEBOT_FACET).getItems());
            } else {
                viewData("message", "Sie haben aktuell noch nicht die n&ouml;tigen Berechtigungen "
                    + "um diesen Einrichtungsdatensatz zu bearbeiten.");
                return getGeoObjectDetailsPage(geoObject.getId());
            }
        } else if (isKiezatlas1GeoObject(geoObject)) {
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
     * Moves a \"Geo Object\" topic into our public default workspace.
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/confirm/{topicId}")
    @Transactional
    public Viewable doConfirmGeoObject(@PathParam("topicId") long topicId) {
        // ### Handle the case if user cannot edit anymore (just see) directly after confirmation.
        if (!isAuthenticated()) return getUnauthorizedPage();
        if (!isConfirmationWorkspaceMember()) {
            viewData("message", "Sie haben aktuell keine Berechtigungen neue Datens&auml;tze zu ver&ouml;ffentlichen.");
            return getUnauthorizedPage();
        }
        Topic geoObject = dm4.getTopic(topicId);
        if (isGeoObjectTopic(geoObject)) {
            moveGeoObjecToWorkspace(geoObject, getStandardWorkspace());
            moveGeoObjecFacetsToWorkspace(geoObject, getStandardWorkspace());
            viewData("message", "Der Eintrag \"" + geoObject.getSimpleValue() + "\" erfolgreich freigeschaltet.");
            List<String> mailboxes = getAssignedUserMailboxes(geoObject);
            sendConfirmationNotice(mailboxes, geoObject);
        } else {
            viewData("message", "Eine Einrichtung mit dieser ID ist uns nicht bekannt.");
            return getPageNotFound();
        }
        return getGeoObjectDetailsPage(geoObject.getId());
    }

    /**
     * Renders details about a Kiezatlas Geo Object into HTML.
     *
     * @param topicId
     * @return
     */
    @GET
    @Path("/{topicId}")
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

    public Viewable getGeoObjectDetailsPage(@PathParam("topicId") long topicId) {
        // ### redirect if user has no READ permission on this topic
        Topic username = getUsernameTopic();
        Topic geoObject = dm4.getTopic(topicId);
        if (!isGeoObjectTopic(geoObject)) return getPageNotFound();
        // Assemble Generic Einrichtungs Infos
        EinrichtungsInfo einrichtung = assembleGeneralEinrichtungsInfo(geoObject);
        // ### Yet Missing: Träger, Bezirksregion, Bezirk, Administrator Infos und Stichworte
        viewData("geoobject", einrichtung);
        // Assemble Category Assignments for Einrichtung;
        viewData("zielgruppen", facets.getFacets(geoObject, ZIELGRUPPE_FACET));
        viewData("themen", facets.getFacets(geoObject, THEMA_FACET));
        // viewData("angebote", facetsService.getFacets(geoObject, ANGEBOT_FACET));
        List<AngebotsinfosAssigned> angebotsInfos = angebote.getCurrentAngebotsinfosAssigned(geoObject);
        if (angebotsInfos.size() > 0) viewData("angebotsinfos", angebotsInfos);
        // user auth
        prepareGeneralPageData("detail");
        // geo object auth
        viewData("is_published",  isGeoObjectPublic(geoObject));
        viewData("editable", isGeoObjectEditable(geoObject, username));
        return view("detail");
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
    @Path("/{topicId}")
    @Produces(MediaType.APPLICATION_JSON)
    public GeoObjectDetailsView getGeoObjectDetails(@HeaderParam("Referer") String referer,
            @PathParam("topicId") long topicId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        Topic geoObject = dm4.getTopic(topicId);
        GeoObjectDetailsView geoDetailsView = null;
        if (isGeoObjectTopic(geoObject)) {
            geoDetailsView = new GeoObjectDetailsView(dm4.getTopic(topicId), geomaps, angebote);
            if (isAssignedToConfirmationWorkspace(geoObject)) geoDetailsView.setUnconfirmed();
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
        // 1) Set default search radius for a query
        double r = (radius.isEmpty() || radius.equals("0")) ? 1.0 : Double.parseDouble(radius);
        List<GeoObjectView> results = new ArrayList<GeoObjectView>();
        // 2) Process spatial search results (=topics of type Geo Coordinate)
        List<Topic> geoObjects = searchGeoObjectsNearby(coordinates, r);
        for (Topic geoTopic : geoObjects) {
            results.add(new GeoObjectView(geoTopic, geomaps, angebote));
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
                results.add(new GeoObjectView(geoObject, geomaps, angebote));
            }
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics by name failed", e);
        }
    }

    /**
     * Fetches a list of streetname geo coordinates pairs from the kiezatlas database.
     * @param referer
     * @param query
     */
    @GET
    @Path("/search/coordinates")
    public List<StreetCoordinates> searchStreetCoordinatesByName(@HeaderParam("Referer") String referer,
            @QueryParam("query") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            log.info("Street Coordinates Query=\""+query+"\"");
            String queryValue = query.trim();
            List<StreetCoordinates> results = new ArrayList<StreetCoordinates>();
            if (queryValue.isEmpty()) return results;
            List<Topic> singleTopics = dm4.searchTopics(queryValue + "*", "dm4.contacts.street");
            for (Topic streetname : singleTopics) {
                List<RelatedTopic> addresses = streetname.getRelatedTopics("dm4.core.aggregation",
                    "dm4.core.child", "dm4.core.parent", "dm4.contacts.address");
                for (RelatedTopic address : addresses) {
                    GeoCoordinate coordinates = geomaps.getGeoCoordinate(address);
                    if (coordinates != null) {
                        StreetCoordinates resultItem = new StreetCoordinates();
                        resultItem.setName(streetname.getSimpleValue().toString());
                        resultItem.setCoordinates(coordinates);
                        results.add(resultItem);
                    }
                }
            }
            log.info("Fetched " + results.size() + " internal street coordinate values");
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching street coordinate values by name failed", e);
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
                    results.add(new GeoObjectView(topic, geomaps, angebote));
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
                        results.add(new GeoObjectView(geoObject, geomaps, angebote));
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

    @GET
    @Path("/bezirk/newsfeed/{topicId}")
    public List<NewsFeedItem> getSiteNewsfeedContent(@HeaderParam("Referer") String referer, @PathParam("topicId") long bezirkId) {
        // if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        List<NewsFeedItem> newsItems = new ArrayList<NewsFeedItem>();
        try {
            Topic bezirk = dm4.getTopic(bezirkId);
            URL rssFeedUrl = null;
            if (bezirk.getTypeUri().equals("ka2.bezirk")) {
                BezirkInfo infoTopic = new BezirkInfo(bezirk);
                if (infoTopic.getSiteRSSFeedURL() == null) return null;
                rssFeedUrl = new URL(infoTopic.getSiteRSSFeedURL().getSimpleValue().toString());
                newsItems = fetchSiteRSSFeed(rssFeedUrl);
                return newsItems;
            }
            return null;
        } catch (Exception ex) {
            log.warning("Site XML Feed could either not be parsed or loaded, please try again: "
                + ex.getMessage() + " caused By: " + ex.getCause().getMessage());
            return newsItems;
        }
    }

    private List<NewsFeedItem> fetchSiteRSSFeed(URL rssFeedUrl) {
        StringBuffer result = new StringBuffer();
        try {
            log.info("Fetching XML Site Feed " + rssFeedUrl);
            URLConnection connection = rssFeedUrl.openConnection();
            connection.setRequestProperty("Content-Type", MediaType.APPLICATION_XML);
            // 2) Read in the response
            BufferedReader rd = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
            String line = "";
            while (rd.ready()) {
                line = rd.readLine();
                result.append(line);
            }
            rd.close();
            List<NewsFeedItem> newsfeed = parseXMLNewsfeedString(result, 3);
            log.info("Site Feed OK - Fetched " + newsfeed.size() + " news items");
            return newsfeed;
        } catch (UnknownHostException uke) {
            throw new WebApplicationException(uke);
        } catch (UnsupportedEncodingException ex) {
            throw new WebApplicationException(ex);
        } catch (IOException ex) {
            throw new WebApplicationException(ex);
        }
    }

    private List<NewsFeedItem> parseXMLNewsfeedString(StringBuffer result, int maxItems) {
        try {
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            DocumentBuilder db = dbf.newDocumentBuilder();
            InputSource is = new InputSource();
            is.setCharacterStream(new StringReader(result.toString()));
            Document doc = db.parse(is);
            NodeList nodes = doc.getElementsByTagName("item");
            // iterate the employees
            int count = 0;
            List<NewsFeedItem> feedItems = new ArrayList<NewsFeedItem>();
            for (int i = 0; i < nodes.getLength(); i++) {
               Element element = (Element) nodes.item(i);
               NewsFeedItem newsItem = new NewsFeedItem();
               // Title of News
               NodeList name = element.getElementsByTagName("title");
               Element line = (Element) name.item(0);
               newsItem.setTitle(getCharacterDataFromElement(line));
               // Text of News
               NodeList description = element.getElementsByTagName("description");
               line = (Element) description.item(0);
               newsItem.setDescription(getCharacterDataFromElement(line));
               // Link URL
               NodeList link = element.getElementsByTagName("link");
               line = (Element) link.item(0);
               newsItem.setLink(getCharacterDataFromElement(line));
               // Date Published
               NodeList title = element.getElementsByTagName("pubDate");
               line = (Element) title.item(0);
               newsItem.setPublished(getCharacterDataFromElement(line));
               // Add news Item
               feedItems.add(newsItem);
               count++;
               if (count == maxItems) break;
            }
            return feedItems;
        }
        catch (Exception e) {
            throw new WebApplicationException(e);
        }
    }

    public static String getCharacterDataFromElement(Element e) {
        Node child = e.getFirstChild();
        if (child instanceof CharacterData) {
            CharacterData cd = (CharacterData) child;
            return cd.getData();
        }
        return "?";
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
                results.add(new GeoObjectView(geoObject, geomaps, angebote));
            }
        }
        log.info("Populating cached list of geo object for district " + bezirkId);
        // insert new result into cache
        districtsCache.put(bezirkId, results);
        districtCachedAt.put(bezirkId, new Date().getTime());
        return results;
    }

    /** ----------------- DEPRECATED: Bezirksregionen Resources Listing -----------------------  **/

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
                results.add(new GeoObjectView(geoObject, geomaps, angebote));
            }
        }
        return results;
    }

    /** *****------------- Internal Geo Code Resources -------------------- */
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



    /** --------------------------- Thymeleaf Template Accessor and Helper Methods -------------------------- */

    private Viewable getFrontpageView() {
        prepareGeneralPageData("ka-index");
        return view("ka-index");
    }

    private Viewable getConfirmationView(List<EinrichtungsInfo> results) {
        prepareGeneralPageData("confirmation");
        viewData("availableLor", getAvailableLORNumberTopics());
        viewData("workspace", getStandardWorkspace());
        viewData("geoobjects", results);
        return view("confirmation");
    }

    private Viewable getSimpleMessagePage() {
        prepareGeneralPageData("message");
        return view("message");
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

    private void prepareFormWithAvailableTopics() {
        viewData("availableCities", getAvailableCityTopics());
        viewData("availableDistricts", getAvailableDistrictTopics());
        viewData("availableCountries", getAvailableCountryTopics());
        viewData("availableThemen", getThemaCriteriaTopics());
        viewData("availableTraeger", getAvailableTraegerTopics());
        // viewData("availableLor", getAvailableLORNumberTopics());
        // viewData("availableAngebote", getAngebotCriteriaTopics());
        viewData("availableZielgruppen", getZielgruppeCriteriaTopics());
        log.info("> Prepare Form Template with available Topics");
    }

    private void prepareGeneralPageData(String templateName) {
        boolean isAuthenticated = isAuthenticated();
        boolean isPrivileged = isConfirmationWorkspaceMember();
        viewData("authenticated", isAuthenticated);
        viewData("is_publisher", isPrivileged);
        viewData("template", templateName);
        log.info("Checking Authorization (isPrivileged=" + isPrivileged + ", isAuthenticated=" + isAuthenticated() + ")");
    }



    /** -------------------- Permission, Workspace and Membership Related Helpers ----------------------- **/

    private boolean hasWorkspaceAssignment(DeepaMehtaObject object) {
        return (dm4.getAccessControl().getAssignedWorkspaceId(object.getId()) > -1);
    }

    private boolean isAssignedToConfirmationWorkspace(DeepaMehtaObject object) {
        return (dm4.getAccessControl().getAssignedWorkspaceId(object.getId()) == getPrivilegedWorkspace().getId());
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
            Topic workspace = getPrivilegedWorkspace();
            return (accesscl.isMember(username, workspace.getId()) || accesscl.getWorkspaceOwner(workspace.getId()).equals(username));
        } else {
            return false;
        }
    }

    private boolean isAuthenticated() {
        return (accesscl.getUsername() != null);
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

    /** ------------------- Kiezatlas Application Model Related Helper Methods -------------------------- **/

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

    private Topic getFacettedContactChildTopic(Topic facettedTopic) {
        return facettedTopic.getRelatedTopic("dm4.core.composition", "dm4.core.parent",
            "dm4.core.child", "ka2.kontakt");
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
            GeoCoordinate geoCoordinate = geomaps.getGeoCoordinate(addressTopic);
            einrichtung.setCoordinates(geoCoordinate);
            // Sets Kontakt Facet
            Topic kontakt = facets.getFacet(geoObject, KONTAKT_FACET);
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
            Topic offnung = facets.getFacet(geoObject, OEFFNUNGSZEITEN_FACET);
            if (offnung != null) einrichtung.setOeffnungszeiten(offnung.getSimpleValue().toString());
            // Beschreibung Facet
            Topic beschreibung = facets.getFacet(geoObject, BESCHREIBUNG_FACET);
            if (beschreibung != null) einrichtung.setBeschreibung(beschreibung.getSimpleValue().toString());
            // Stichworte Facet
            Topic stichworte = facets.getFacet(geoObject, STICHWORTE_FACET);
            if (stichworte != null) einrichtung.setStichworte(stichworte.getSimpleValue().toString());
            // LOR Nummer Facet
            Topic lor = facets.getFacet(geoObject, LOR_FACET);
            if (lor != null) einrichtung.setLORId(lor.getSimpleValue().toString());
            // Website Facet
            Topic website = facets.getFacet(geoObject, WEBSITE_FACET);
            if (website != null) einrichtung.setWebpage(website.getSimpleValue().toString());
            einrichtung.setId(geoObject.getId());
        } catch (Exception ex) {
            throw new RuntimeException("Could not assemble EinrichtungsInfo", ex);
        }
        return einrichtung;
    }

    private boolean isGeoObjectTopic(Topic geoObject) {
        // ### Checking for typeuri AND Confirmed flagmay be redundant
        return geoObject != null && geoObject.getTypeUri().equals(KiezatlasService.GEO_OBJECT);
            // && geoObject.getChildTopics().getBoolean(CONFIRMED_TYPE);
    }

    private boolean isGeoObjectEditable(Topic geoObject, Topic username) {
        return isAssignedUsername(geoObject, username) && isKiezatlas1GeoObject(geoObject);
    }

    /** ### Actually check the workspace's SharingMode **/
    private boolean isGeoObjectPublic(Topic geoObject) {
        Topic workspace = workspaces.getAssignedWorkspace(geoObject.getId());
        return (workspace.getUri().equals(WorkspacesService.DEEPAMEHTA_WORKSPACE_URI));
    }

    private boolean isKiezatlas1GeoObject(Topic geoObject) {
        return (geoObject.getUri().startsWith(KA1_GEO_OBJECT_URI_PREFIX));
    }

    /** ----------------------------- Create and Update Geo Object Implementation ----------------------- */

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
            // All new webbrowser url topics will be assign to Standard Workspace
            writeSimpleKeyCompositeFacet(geoObject, WEBSITE_FACET, "dm4.webbrowser.url", website);
            // Handle Category Relations
            updateCriteriaFacets(geoObject, themen, zielgruppen, angebote);
        } catch (Exception ex) {
            Logger.getLogger(WebsitePlugin.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    private Association createUserAssignment(final Topic geoObject, final String username) {
        final Topic usernameTopic = getUsernameTopic();
        if (!isAssignedUsername(geoObject, usernameTopic)) {
            try {
                return dm4.getAccessControl().runWithoutWorkspaceAssignment(new Callable<Association>() {
                    @Override
                    public Association call() {
                        // Assign all new "confirmed"-flag topics to our dedicated "Confirmation"-Workspace
                        Association assignment = dm4.createAssociation(mf.newAssociationModel("de.kiezatlas.user_assignment",
                            mf.newTopicRoleModel(geoObject.getId(), "dm4.core.default"),
                            mf.newTopicRoleModel(usernameTopic.getId(), "dm4.core.default")));
                        log.info("Created User Assignment ("+username+") for Geo Object \"" + geoObject.getSimpleValue() + "\" without Workspace Assignment");
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
                            + "\" and File Topic \""+files.getFile(fileTopicId).toString()+"\"");
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

    private List<Topic> searchGeoObjectsNearby(String coordinates, double radius) {
        List<Topic> results = new ArrayList<Topic>();
        double lon, lat;
        // 1) Parse Coordinate values
        if (coordinates != null && !coordinates.isEmpty() && coordinates.contains(",")) {
            lon = Double.parseDouble(coordinates.split(",")[0].trim());
            lat = Double.parseDouble(coordinates.split(",")[1].trim());
            List<Topic> geoCoordTopics = geospatial.getTopicsWithinDistance(new GeoCoordinate(lon, lat), radius);
            // 2) Process spatial search results (=topics of type Geo Coordinate)
            for (Topic geoCoordTopic : geoCoordTopics) {
                Topic geoObject = kiezatlas.getGeoObjectByGeoCoordinateTopic(geoCoordTopic);
                // spatial search may deliver geo coordinates topics not (anymore) related to a geo object
                if (geoObject != null) results.add(geoObject);
            }
        } else {
            log.warning("Searching Geo Objects Failed due to based Coordinates given: " + coordinates);
        }
        return results;
    }

    /** ------------------- Model and Facet Model Helper Methods ------------------------ **/

    private void updateSimpleCompositeFacet(Topic geoObject, String facetTypeUri, String childTypeUri, String value) {
        Topic oldFacetTopic = facets.getFacet(geoObject.getId(), facetTypeUri);
        if (!value.trim().isEmpty()) {
            facets.updateFacet(geoObject.getId(), facetTypeUri, mf.newFacetValueModel(childTypeUri).put(value.trim()));
            if (oldFacetTopic != null) oldFacetTopic.delete();
        }
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

    private void updateCriteriaFacets(Topic geoObject, List<Long> themen, List<Long> zielgruppen, List<Long> angebote) {
        List<RelatedTopic> formerThemen = facets.getFacets(geoObject, THEMA_FACET);
        List<RelatedTopic> formerZielgruppen = facets.getFacets(geoObject, ZIELGRUPPE_FACET);
        // List<RelatedTopic> formerAngebote = facetsService.getFacets(geoObject, ANGEBOT_FACET);
        delFacetTopicReferences(geoObject, formerThemen, THEMA_FACET, THEMA_CRIT);
        delFacetTopicReferences(geoObject, formerZielgruppen, ZIELGRUPPE_FACET, ZIELGRUPPE_CRIT);
        /// delRefFacetTopics(geoObject, formerAngebote, ANGEBOT_FACET, ANGEBOT_CRIT);
        putFacetTopicsReferences(geoObject, themen, THEMA_FACET, THEMA_CRIT);
        putFacetTopicsReferences(geoObject, zielgruppen, ZIELGRUPPE_FACET, ZIELGRUPPE_CRIT);
        // putRefFacets(geoObject, angebote, ANGEBOT_FACET, ANGEBOT_CRIT);
    }

    private void updateContactFacet(Topic geoObject, String ansprechpartner, String telefon, String email, String fax) {
        Topic kontakt = facets.getFacet(geoObject, KONTAKT_FACET);
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
        // check if value already exist in a topic/db and if so, reference that
        try { // and if it exists, we might need to catch an AccessControlException...
            Topic keyTopic = dm4.getTopicByValue(childTypeUri, new SimpleValue(value.trim()));
            if (!value.trim().isEmpty()) {
                if (oldFacetTopic != null && !oldFacetTopic.getSimpleValue().toString().equals(value.trim())) {
                    // old value is existent and same as new value, do nothing
                } else if (keyTopic != null) { // reference existing topic
                    facets.updateFacet(geoObject.getId(), facetTypeUri,
                        mf.newFacetValueModel(childTypeUri).putRef(keyTopic.getId()));
                } else { // create new topic with new value
                    facets.updateFacet(geoObject.getId(), facetTypeUri,
                        mf.newFacetValueModel(childTypeUri).put(value.trim()));
                }
            }
        } catch (RuntimeException re) { // If fetching an existing value fails, eg. ACL we def. create a new one
            facets.updateFacet(geoObject.getId(), facetTypeUri,
                mf.newFacetValueModel(childTypeUri).put(value.trim()));
        }
    }

    private void writeBezirksFacet(Topic geoObject, long bezirksTopicId) {
        if (bezirksTopicId > -1) {
            facets.updateFacet(geoObject.getId(), WebsiteService.BEZIRK_FACET,
                mf.newFacetValueModel(WebsiteService.BEZIRK).putRef(bezirksTopicId));
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
        List<RelatedTopic> childTopics = facetTopicValue.getRelatedTopics(typeUris, "dm4.core.parent", "dm4.core.child", null);
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
        List<RelatedTopic> childTopics = facetTopicValue.getRelatedTopics(typeUris, "dm4.core.parent", "dm4.core.child", null);
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

    private boolean isValidReferer(String ref) {
        if (ref == null) return false;
        if (ref.contains(".kiezatlas.de/") || ref.contains("localhost")) {
            return true;
        } else {
            return false;
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



    /** ----------------- Rest of the Kiezatlas Application Model Related Getter Utilies -------------------------- */

    private Topic getAssignedWorkspace(Topic geoObject) {
        return workspaces.getAssignedWorkspace(geoObject.getId());
    }

    private Topic getStandardWorkspace() {
        return workspaces.getWorkspace(workspaces.DEEPAMEHTA_WORKSPACE_URI);
    }

    private Topic getPrivilegedWorkspace() {
        return dm4.getAccessControl().getWorkspace(CONFIRMATION_WS_URI);
    }

    private Topic getUsernameTopic() {
        String username = accesscl.getUsername();
        if (username != null && !username.isEmpty()) {
            return accesscl.getUsernameTopic(username);
        } else {
            return null;
        }
    }

    private String getFirstUsernameAssigned(Topic geoObject) {
        List<RelatedTopic> assignments = getAssignedUsernameTopics(geoObject);
        for (RelatedTopic assignedUsername : assignments) {
            return assignedUsername.getSimpleValue().toString();
        }
        return null;
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

    /** Listen to Angebots Assignment Event from Kiezatlas Angebote Service */
    private Topic getEinrichtungsMailbox(Topic geoObject) {
        Topic kontakt = facets.getFacet(geoObject, KONTAKT_FACET);
        if (kontakt != null) {
            Topic eMail = kontakt.getChildTopics().getTopicOrNull("ka2.kontakt.email");
            if (eMail != null) return eMail;
        }
        log.warning("Kontakt and Email Facet value NOT AVAILALBE");
        return null;
    }

    /** Informs editors of their geo object about changes. */
    private List<String> getAssignedUserMailboxes(Topic geoObject) {
        List<String> mailboxes = new ArrayList<String>();
        List<RelatedTopic> usernames = geoObject.getRelatedTopics(USER_ASSIGNMENT, "dm4.core.default",
            "dm4.core.default", "dm4.accesscontrol.username");
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

    private List<Topic> getAvailableDistrictTopics() {
        List<Topic> topics = dm4.getTopicsByType("ka2.bezirk");
        List<Topic> results = topics;
        sortAlphabeticalDescending(results);
        return results;
    }

    private List<? extends Topic> sortAlphabeticalDescending(List<? extends Topic> topics) {
        Collections.sort(topics, new Comparator<Topic>() {
            public int compare(Topic t1, Topic t2) {
                String one = t1.getSimpleValue().toString();
                String two = t2.getSimpleValue().toString();
                return one.compareTo(two);
            }
        });
        return topics;
    }

    private void sortByModificationDateDescending(List<? extends Topic> topics) {
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

    private void initiallyAssignGeoObjectFacetsToWorkspace(Topic geoObject, Topic workspace) {
        Topic addressObject = geoObject.getChildTopics().getTopic("dm4.contacts.address");
        initiallyAssignSingleFacetToWorkspace(addressObject, "dm4.geomaps.geo_coordinate_facet", workspace.getId());
        initiallyAssignSingleFacetToWorkspace(geoObject, BESCHREIBUNG_FACET, workspace.getId());
        initiallyAssignSingleFacetToWorkspace(geoObject, OEFFNUNGSZEITEN_FACET, workspace.getId());
        initiallyAssignSingleFacetToWorkspace(geoObject, BEZIRK_FACET, workspace.getId());
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

    private void moveGeoObjecToWorkspace(Topic geoObject, Topic workspace) {
        ChildTopics geoObjectChilds = geoObject.loadChildTopics().getChildTopics();
        Topic addressObject = geoObjectChilds.getTopic("dm4.contacts.address");
        ChildTopics addressChilds = addressObject.loadChildTopics().getChildTopics();
        Topic coordinateTopic = kiezatlas.getGeoCoordinateFacet(addressObject);
        coordinateTopic.loadChildTopics();
        workspaces.assignToWorkspace(geoObject, workspace.getId());
        workspaces.assignToWorkspace(geoObjectChilds.getTopic("ka2.geo_object.name"), workspace.getId());
        workspaces.assignToWorkspace(coordinateTopic, workspace.getId());
        workspaces.assignToWorkspace(coordinateTopic.getChildTopics().getTopic("dm4.geomaps.longitude"), workspace.getId());
        workspaces.assignToWorkspace(coordinateTopic.getChildTopics().getTopic("dm4.geomaps.latitude"), workspace.getId());
        workspaces.assignToWorkspace(addressObject, workspace.getId());
        workspaces.assignToWorkspace(addressChilds.getTopicOrNull("dm4.contacts.street"), workspace.getId());
        workspaces.assignToWorkspace(addressChilds.getTopic("dm4.contacts.postal_code"), workspace.getId());
        workspaces.assignToWorkspace(addressChilds.getTopic("dm4.contacts.city"), workspace.getId());
        Topic addressCountry = addressChilds.getTopicOrNull("dm4.contacts.country");
        workspaces.assignToWorkspace(addressCountry, workspace.getId());
        log.info("Basic Geo Object, Address and Coordinate Facet moved to Workspace \"" + workspace.getSimpleValue() + "\"");
    }

    private void moveGeoObjecFacetsToWorkspace(Topic geoObject, Topic workspace) {
        Topic addressObject = geoObject.getChildTopics().getTopic("dm4.contacts.address");
        moveSingleFacetToWorkspace(addressObject, "dm4.geomaps.geo_coordinate_facet", workspace.getId());
        moveSingleFacetToWorkspace(geoObject, BESCHREIBUNG_FACET, workspace.getId());
        moveSingleFacetToWorkspace(geoObject, OEFFNUNGSZEITEN_FACET, workspace.getId());
        moveSingleFacetToWorkspace(geoObject, BEZIRK_FACET, workspace.getId());
        moveSingleFacetToWorkspace(geoObject, WEBSITE_FACET, workspace.getId());
        moveMultiFacetToWorkspace(geoObject, THEMA_FACET, workspace.getId()); // Topics already in "Kiezatlas"
        moveMultiFacetToWorkspace(geoObject, ZIELGRUPPE_FACET, workspace.getId()); // But Associations new
        moveMultiFacetToWorkspace(geoObject, ANGEBOT_FACET, workspace.getId());
        log.info("Moved Geo Object Facets to Workspace \"" + workspace.getSimpleValue() + "\"");
    }


    /** -----------------------  Other Utility Resources (Geo Coding and Reverse Geo Coding) ----------------------- */

    private long mapGoogleDistrictNameToKiezatlasBezirksTopic(String googleDistrict) {
        List<Topic> districts = getAvailableDistrictTopics();
        for (Topic district : districts) {
            if (district.getSimpleValue().toString().equals(googleDistrict)) return district.getId();
            if (googleDistrict.contains(district.getSimpleValue().toString())) return district.getId();
        }
        return -1;
    }

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

}
