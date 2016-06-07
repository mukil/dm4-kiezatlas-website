package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.TopicType;
import de.deepamehta.core.model.AssociationDefinitionModel;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.plugins.workspaces.WorkspacesService;

import java.util.logging.Logger;


public class Migration6 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    static final String KIEZATLAS_WORKSPACE_URI = "de.kiezatlas.workspace";

    @Inject private WorkspacesService workspaceService;

    @Override
    public void run() {
        
        log.info("##### Setup Website Geo Object \"Confirmed\" Child Type in Website Migration Nr. 5 #####");

        // 1) Assign all our types from migration1 to the "Kiezatlas" workspace so "admin" can edit these definitions
        Topic kiezatlas = workspaceService.getWorkspace(KIEZATLAS_WORKSPACE_URI);
        TopicType confirmationFlag = dms.getTopicType("ka2.website.confirmed");
        workspaceService.assignTypeToWorkspace(confirmationFlag, kiezatlas.getId());
        // 2) Assign "Confirmed"-Flag to "Geo Object"..
        //    .. to introduce a "publishing" workflow around "self-registered" / publicly created Geo Objects
        TopicType geoObject = dms.getTopicType("ka2.geo_object");
        geoObject.addAssocDef(new AssociationDefinitionModel("dm4.core.composition_def",
            "ka2.geo_object", "ka2.website.confirmed", "dm4.core.one", "dm4.core.one"));

    }
}