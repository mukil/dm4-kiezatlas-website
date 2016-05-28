package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.core.service.accesscontrol.SharingMode;
import de.deepamehta.plugins.accesscontrol.AccessControlService;
import de.deepamehta.plugins.workspaces.WorkspacesService;
import static de.kiezatlas.website.WebsiteService.CONFIRMATION_WS_NAME;
import static de.kiezatlas.website.WebsiteService.CONFIRMATION_WS_URI;



public class Migration6 extends Migration {

    @Inject
    private WorkspacesService workspaceService;

    @Inject
    private AccessControlService acService;

    @Override
    public void run() {
        // 1) Create "Confirmation" workspace
        Topic workspace = workspaceService.getWorkspace(CONFIRMATION_WS_URI);
        workspaceService.createWorkspace(CONFIRMATION_WS_NAME, CONFIRMATION_WS_URI, SharingMode.PUBLIC);
        acService.setWorkspaceOwner(workspace, AccessControlService.ADMIN_USERNAME);
    }

}