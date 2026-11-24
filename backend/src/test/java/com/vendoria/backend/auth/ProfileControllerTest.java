package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.AuthDtos.UserResponse;
import com.vendoria.backend.auth.ProfileDtos.ProfileRequest;

class ProfileControllerTest {

	private final ProfileService service = mock(ProfileService.class);
	private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new ProfileController(service)).build();

	private MockHttpSession session() {
		MockHttpSession session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, 7L);
		return session;
	}

	@Test
	void getAndUpdateUseSessionIdentityEvenIfBodySuppliesAnotherUser() throws Exception {
		var response = new UserResponse(7L, "Budi", "budi@example.com", "081234567890", "customer",
				"belum_diverifikasi", null, null, false, null);
		when(service.get(7L)).thenReturn(response);
		when(service.update(eq(7L), any())).thenReturn(response);
		mvc.perform(get("/api/account/profile").session(session()))
				.andExpect(status().isOk()).andExpect(jsonPath("$.user_id").value(7));
		mvc.perform(put("/api/account/profile").session(session()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"user_id":99,"role":"admin","nama":" Budi ","email":"BUDI@example.com","no_telp":"0812 3456 7890"}
						"""))
				.andExpect(status().isOk()).andExpect(jsonPath("$.user_id").value(7))
				.andExpect(jsonPath("$.role").value("customer"))
				.andExpect(jsonPath("$.password_hash").doesNotExist());
		verify(service).update(7L, new ProfileRequest("Budi", "budi@example.com", "081234567890"));
	}

	@Test
	void rejectsInvalidAndOversizedInputBeforeCallingService() throws Exception {
		for (String body : new String[] {
				"{\"nama\":\"   \",\"email\":\"salah\",\"no_telp\":\"abc\"}",
				"{\"nama\":\"" + "a".repeat(121) + "\",\"email\":\"b@example.com\",\"no_telp\":\"08123456789\"}",
				"{\"nama\":\"Budi\",\"email\":\"b@example.com\"}" }) {
			mvc.perform(put("/api/account/profile").session(session()).contentType(MediaType.APPLICATION_JSON).content(body))
					.andExpect(status().isBadRequest());
		}
		verifyNoInteractions(service);
	}

	@Test
	void missingSessionReturnsUnauthorizedAndDoesNotCreateSession() throws Exception {
		when(service.get(null)).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Belum login"));
		var result = mvc.perform(get("/api/account/profile")).andExpect(status().isUnauthorized()).andReturn();
		assertEquals(null, result.getRequest().getSession(false));
	}
}
