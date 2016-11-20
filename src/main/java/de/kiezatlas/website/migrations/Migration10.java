package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.TopicType;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.workspaces.WorkspacesService;

import java.util.logging.Logger;


/**
 * Extend the "Kiezatlas Website" type definition and assign all new types to the proper Workspace.
 * @author Malte Reißig
 */
public class Migration10 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    static final String KIEZATLAS_WORKSPACE_URI = "de.kiezatlas.workspace";

    @Inject private WorkspacesService workspaceService;

    @Override
    public void run() {
        log.info("##### Migration Nr.10: \"Kiezatlas Website\" Type Definition Extension Nr.2 STARTS #####");
        // 1) Assign all our types from migration1 to the "Kiezatlas" workspace so "admin" can edit these definitions
        Topic kiezatlas = workspaceService.getWorkspace(KIEZATLAS_WORKSPACE_URI);
        TopicType siteAutoSelect = dm4.getTopicType("ka2.website.auto_selection");
        TopicType siteUsesCaching = dm4.getTopicType("ka2.website.use_caching");
        TopicType siteUsesMarkercluster = dm4.getTopicType("ka2.website.use_markercluster");
        TopicType siteIconStylesheet = dm4.getTopicType("ka2.website.icon_stylesheet");
        TopicType siteUsesLocationSearch = dm4.getTopicType("ka2.website.use_location_search");
        TopicType siteDoesLocationPrompt = dm4.getTopicType("ka2.website.ask_for_location");
        TopicType siteUsesFahrinfoLink = dm4.getTopicType("ka2.website.use_fahrinfo_link");
        workspaceService.assignTypeToWorkspace(siteAutoSelect, kiezatlas.getId());
        workspaceService.assignTypeToWorkspace(siteUsesCaching, kiezatlas.getId());
        workspaceService.assignTypeToWorkspace(siteUsesMarkercluster, kiezatlas.getId());
        workspaceService.assignTypeToWorkspace(siteIconStylesheet, kiezatlas.getId());
        workspaceService.assignTypeToWorkspace(siteUsesLocationSearch, kiezatlas.getId());
        workspaceService.assignTypeToWorkspace(siteDoesLocationPrompt, kiezatlas.getId());
        workspaceService.assignTypeToWorkspace(siteUsesFahrinfoLink, kiezatlas.getId());
        // 2) Assign the new child types to the "ka2.website" composite type
        TopicType kaWebsite = dm4.getTopicType("ka2.website");
        kaWebsite.addAssocDef(mf.newAssociationDefinitionModel("dm4.core.composition_def", kaWebsite.getUri(),
            siteAutoSelect.getUri(), "dm4.core.one", "dm4.core.one"));
        kaWebsite.addAssocDef(mf.newAssociationDefinitionModel("dm4.core.composition_def", kaWebsite.getUri(),
            siteUsesCaching.getUri(), "dm4.core.one", "dm4.core.one"));
        kaWebsite.addAssocDef(mf.newAssociationDefinitionModel("dm4.core.composition_def", kaWebsite.getUri(),
            siteUsesMarkercluster.getUri(), "dm4.core.one", "dm4.core.one"));
        kaWebsite.addAssocDef(mf.newAssociationDefinitionModel("dm4.core.composition_def", kaWebsite.getUri(),
            siteIconStylesheet.getUri(), "dm4.core.one", "dm4.core.one"));
        kaWebsite.addAssocDef(mf.newAssociationDefinitionModel("dm4.core.composition_def", kaWebsite.getUri(),
            siteUsesLocationSearch.getUri(), "dm4.core.one", "dm4.core.one"));
        kaWebsite.addAssocDef(mf.newAssociationDefinitionModel("dm4.core.composition_def", kaWebsite.getUri(),
            siteDoesLocationPrompt.getUri(), "dm4.core.one", "dm4.core.one"));
        kaWebsite.addAssocDef(mf.newAssociationDefinitionModel("dm4.core.composition_def", kaWebsite.getUri(),
            siteUsesFahrinfoLink.getUri(), "dm4.core.one", "dm4.core.one"));
        // 4) Configure custom dm-webclient renderer to webalias type
        log.info("##### Migration Nr.10: Kiezatlas Website Type Definition Extension Nr.2 COMPLETE #####");
    }
}