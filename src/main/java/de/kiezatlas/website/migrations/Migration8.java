package de.kiezatlas.website.migrations;

import de.deepamehta.core.AssociationType;
import de.deepamehta.core.Topic;
import de.deepamehta.core.TopicType;
import de.deepamehta.core.ViewConfiguration;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.workspaces.WorkspacesService;

import java.util.logging.Logger;


/**
 * Extend the "Kiezatlas Website" type definition and assign all new types to the proper Worksapce.
 * @author malted
 */
public class Migration8 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    static final String KIEZATLAS_WORKSPACE_URI = "de.kiezatlas.workspace";

    @Inject private WorkspacesService workspaceService;

    @Override
    public void run() {
        log.info("##### Assign new types to \"Kiezatlas Website\" topic in Website Migration Nr. 8 #####");
        // 1) Assign all our types from migration1 to the "Kiezatlas" workspace so "admin" can edit these definitions
        Topic kiezatlas = workspaceService.getWorkspace(KIEZATLAS_WORKSPACE_URI);
        TopicType siteRSSFeedUrlType = dm4.getTopicType("ka2.website.site_rss_feed_url");
        TopicType bezirkInfoAreaType = dm4.getTopicType("ka2.website.bezirk_info");
        AssociationType bildAssignmentEdgeType = dm4.getAssociationType("de.kiezatlas.bild_assignment");
        AssociationType userAssignmentEdgeType = dm4.getAssociationType("de.kiezatlas.user_assignment");
        TopicType webAlias = dm4.getTopicType("ka2.website.web_alias");
        TopicType siteInfoAreaType = dm4.getTopicType("ka2.website.site_info");
        workspaceService.assignTypeToWorkspace(siteRSSFeedUrlType, kiezatlas.getId());
        workspaceService.assignTypeToWorkspace(siteInfoAreaType, kiezatlas.getId());
        workspaceService.assignTypeToWorkspace(bezirkInfoAreaType, kiezatlas.getId());
        workspaceService.assignTypeToWorkspace(bildAssignmentEdgeType, kiezatlas.getId());
        workspaceService.assignTypeToWorkspace(userAssignmentEdgeType, kiezatlas.getId());
        workspaceService.assignTypeToWorkspace(webAlias, kiezatlas.getId());
        // 2) Assign the new child types to the "ka2.website" composite type
        TopicType kaWebsite = dm4.getTopicType("ka2.website");
        kaWebsite.addAssocDef(mf.newAssociationDefinitionModel("dm4.core.composition_def", kaWebsite.getUri(),
            webAlias.getUri(), "dm4.core.one", "dm4.core.one"));
        kaWebsite.addAssocDef(mf.newAssociationDefinitionModel("dm4.core.composition_def", kaWebsite.getUri(),
            siteRSSFeedUrlType.getUri(), "dm4.core.one", "dm4.core.one"));
        kaWebsite.addAssocDef(mf.newAssociationDefinitionModel("dm4.core.composition_def", kaWebsite.getUri(),
            siteInfoAreaType.getUri(), "dm4.core.one", "dm4.core.one"));
        // 4) Configure custom dm-webclient renderer to webalias type
        ViewConfiguration viewConfig = webAlias.getViewConfig();
        viewConfig.addSetting("dm4.webclient.view_config",
                "dm4.webclient.simple_renderer_uri", "ka2.website.web_alias_renderer");
        log.info("##### Kiezatlas Website Migration Nr. 8 COMPLETED #####");
    }
}